let { CronJob } = require('cron');
const logs = console.log.bind(console);
const { each } = require('lodash');

module.exports.latest = new CronJob('1 * * * * *', async () => {
    logs(`[server] job: fetching latest rss feed ${Date.now()}`);
    require('../controllers/filing').fetchLatest('sec');
}, null, true, 'America/Los_Angeles')