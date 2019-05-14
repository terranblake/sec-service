const { map, each } = require('lodash');
const { processRawRssItem } = require('../utils/raw-data-helpers');
const gcp = require('../utils/gcp');
const { logs } = require('../utils/logging');
const util = require('util');

const fetchLinks = {
    'sec': 'https://www.sec.gov/Archives/edgar/xbrlrss.all.xml',
};

let Parser = require('rss-parser');
let parser = new Parser({
    customFields: {
        feed: ['link', 'extendedDescription'],
        item: [['edgar:xbrlFiling', 'filing']],
    }
});

module.exports.fetchLatestFilings = async function (fetchSource) {
    let feed = await parser.parseURL(fetchLinks[fetchSource]);
    // logs(`items ${util.inspect(feed.items, { showHidden: true })}`);
    for (const key in Object.keys(feed.items)) {
        const item = feed.items[key];
        // logs(`item ${util.inspect(item, { showHidden: true })}`);
        const filing = await processRawRssItem(item);

        // TODO :: Make a topic resolver for a
        //          decoupled topic approach
        if (filing) {
            gcp.pubsub.publish('UnprocessedFilings', filing);
        }
    };

    return feed.items.length;
};