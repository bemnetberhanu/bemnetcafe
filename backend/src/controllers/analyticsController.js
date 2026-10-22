const {
  getFinancialReport,
  getSalesRanking,
  getDayOfWeekPatterns,
  getDailySummary,
} = require('../services/financialService');

async function financialReport(req, res) {
  const { start_date, end_date, group_by = 'day' } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required.' });
  }

  try {
    const report = await getFinancialReport(new Date(start_date), new Date(end_date), group_by);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function salesRanking(req, res) {
  const { days = 30 } = req.query;
  try {
    const ranking = await getSalesRanking(parseInt(days));
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function dayOfWeekPatterns(req, res) {
  const { days = 90 } = req.query;
  try {
    const patterns = await getDayOfWeekPatterns(parseInt(days));
    res.json(patterns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function dailySummary(req, res) {
  const { date } = req.query;
  try {
    const summary = await getDailySummary(date ? new Date(date) : new Date());
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { financialReport, salesRanking, dayOfWeekPatterns, dailySummary };
