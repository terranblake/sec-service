let { CronJob } = require('cron');
const { each } = require('lodash');

module.exports = new CronJob('1 * * * * *', async () => {
    logs(`[server] job: fetching latest rss feed ${Date.now()}`);
    require('../controllers/filing').fetchLatest();
}, null, true, 'America/Los_Angeles')