let { CronJob } = require('cron');
const { logs } = require('./logging');

module.exports.latest = new CronJob('1 * * * * *', async () => {
    logs(`job: fetching latest rss feed ${Date.now()}`);
    require('../controllers/filing').fetchLatest('sec');
}, null, true, 'America/Los_Angeles')