const pool = require('../database/db');

async function getFinancialReport(startDate, endDate, groupBy = 'day') {
  // Revenue
  const [revRows] = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS revenue
     FROM orders
     WHERE order_date >= ? AND order_date < ?`,
    [startDate, endDate]
  );
  const revenue = parseFloat(revRows[0].revenue);

  // COGS
  const [cogsRows] = await pool.query(
    `SELECT COALESCE(SUM(oi.quantity * ri.quantity_required * i.cost_per_unit), 0) AS cogs
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN recipe_ingredients ri ON ri.recipe_item_id = oi.recipe_item_id
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE o.order_date >= ? AND o.order_date < ?`,
    [startDate, endDate]
  );
  const cogs = parseFloat(cogsRows[0].cogs);

  // Operating expenses
  const [expRows] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_expenses
     FROM operating_expenses
     WHERE expense_date >= ? AND expense_date < ?`,
    [startDate, endDate]
  );
  const operatingCosts = parseFloat(expRows[0].total_expenses);

  const profit = revenue - (cogs + operatingCosts);

  // Chart data — MySQL uses DATE_FORMAT instead of DATE_TRUNC
  // day → '%Y-%m-%d', week → '%Y-%u', month → '%Y-%m'
  let dateFormat;
  if (groupBy === 'week') dateFormat = '%Y-%u';
  else if (groupBy === 'month') dateFormat = '%Y-%m';
  else dateFormat = '%Y-%m-%d';

  const [chartRows] = await pool.query(
    `SELECT
       DATE_FORMAT(order_date, ?) AS period,
       COALESCE(SUM(total_amount), 0) AS revenue
     FROM orders
     WHERE order_date >= ? AND order_date < ?
     GROUP BY period
     ORDER BY period`,
    [dateFormat, startDate, endDate]
  );  const chartData = chartRows.map(row => ({
    period: row.period,
    revenue: parseFloat(row.revenue),
    profit: revenue > 0 ? parseFloat(row.revenue) * (profit / revenue) : 0,
  }));

  return {
    period: { start: startDate, end: endDate, groupBy },
    summary: {
      revenue,
      cogs,
      operating_costs: operatingCosts,
      gross_profit: revenue - cogs,
      net_profit: profit,
      profit_margin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : '0.00',
    },
    chart_data: chartData,
  };
}

async function getSalesRanking(days = 30) {
  const [rows] = await pool.query(
    `SELECT
       ri.id AS recipe_item_id,
       ri.name AS item_name,
       ri.category,
       v.id AS variation_id,
       v.name AS variation_name,
       SUM(oi.quantity) AS total_sold,
       SUM(oi.subtotal) AS total_revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN recipe_items ri ON ri.id = oi.recipe_item_id
     LEFT JOIN variations v ON v.id = oi.variation_id
     WHERE o.order_date >= NOW() - INTERVAL ? DAY
     GROUP BY ri.id, ri.name, ri.category, v.id, v.name
     ORDER BY total_sold DESC`,
    [days]
  );

  const items = rows.map(r => ({
    recipe_item_id: r.recipe_item_id,
    item_name: r.variation_name ? `${r.item_name} (${r.variation_name})` : r.item_name,
    category: r.category,
    total_sold: parseInt(r.total_sold),
    total_revenue: parseFloat(r.total_revenue),
  }));

  return {
    period_days: days,
    top_sellers: items.slice(0, 10),
    worst_sellers: items.slice(-5).reverse(),
    all_items: items,
  };
}

async function getDayOfWeekPatterns(days = 90) {
  // Limit to a rolling window (default 90 days) so this query stays fast
  // regardless of how many years of historical data exist in the table.
  const [rows] = await pool.query(
    `SELECT
       DAYNAME(o.order_date) AS day_of_week,
       DAYOFWEEK(o.order_date) AS dow_num,
       ri.name AS item_name,
       SUM(oi.quantity) AS total_sold,
       COUNT(DISTINCT o.id) AS order_count,
       AVG(oi.quantity) AS avg_per_day
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN recipe_items ri ON ri.id = oi.recipe_item_id
     WHERE o.order_date >= NOW() - INTERVAL ? DAY
     GROUP BY day_of_week, dow_num, ri.name
     ORDER BY dow_num, total_sold DESC`,
    [days]
  );

  const dayMap = {};
  for (const row of rows) {
    const day = row.day_of_week;
    if (!dayMap[day]) {
      dayMap[day] = {
        day_of_week: day,
        dow_num: parseInt(row.dow_num),
        top_seller: row.item_name,
        avg_sales: parseFloat(row.avg_per_day).toFixed(1),
        all_items: [],
      };
    }
    dayMap[day].all_items.push({
      item: row.item_name,
      total_sold: parseInt(row.total_sold),
      avg_per_day: parseFloat(row.avg_per_day).toFixed(1),
    });
  }

  return Object.values(dayMap).sort((a, b) => a.dow_num - b.dow_num);
}

async function getDailySummary(date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [orderRows] = await pool.query(
    `SELECT
       COUNT(*) AS order_count,
       COALESCE(SUM(total_amount), 0) AS total_revenue,
       COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) AS cash_revenue,
       COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) AS card_revenue
     FROM orders
     WHERE order_date >= ? AND order_date <= ?`,
    [dayStart, dayEnd]
  );

  const [itemRows] = await pool.query(
    `SELECT ri.name, SUM(oi.quantity) AS qty_sold
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN recipe_items ri ON ri.id = oi.recipe_item_id
     WHERE o.order_date >= ? AND o.order_date <= ?
     GROUP BY ri.name
     ORDER BY qty_sold DESC
     LIMIT 5`,
    [dayStart, dayEnd]
  );

  const s = orderRows[0];
  return {
    date: dayStart.toISOString().split('T')[0],
    order_count: parseInt(s.order_count),
    total_revenue: parseFloat(s.total_revenue),
    cash_revenue: parseFloat(s.cash_revenue),
    card_revenue: parseFloat(s.card_revenue),
    top_items_today: itemRows.map(r => ({
      item: r.name,
      qty_sold: parseInt(r.qty_sold),
    })),
  };
}

module.exports = {
  getFinancialReport,
  getSalesRanking,
  getDayOfWeekPatterns,
  getDailySummary,
};
