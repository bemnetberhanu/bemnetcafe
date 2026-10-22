const cron = require('node-cron');
const { runDailyLowStockCheck } = require('../services/notificationService');

/**
 * Schedule the daily "nag" notification job.
 * Runs every day at 9:00 AM server time.
 * This will keep sending alerts every day until the ingredient is restocked
 * above the reorder level via a Purchase entry.
 */
function startScheduler() {
  // Cron syntax: minute hour day month dayOfWeek
  // '0 9 * * *' = 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log(`\n⏰ [CRON] Running daily low-stock check at ${new Date().toLocaleString()}`);
    try {
      const result = await runDailyLowStockCheck();
      console.log(`✅ [CRON] Daily check complete. ${result.notificationsCreated} notification(s) created.\n`);
    } catch (err) {
      console.error('❌ [CRON] Daily stock check failed:', err.message);
    }
  }, {
    timezone: 'Africa/Addis_Ababa', // Set to restaurant's local timezone
  });

  console.log('⏰ Daily stock-check scheduler started (runs at 9:00 AM Africa/Addis_Ababa)');
}

module.exports = { startScheduler };
