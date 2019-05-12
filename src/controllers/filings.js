const { map } = require('lodash');
const { processRawRssItem } = require('../utils/raw-data-helpers');

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

module.exports.fetchLatest = async (fetchSource) => {
    let feed = await parser.parseURL(fetchLinks[fetchSource]);
    const filings = await map(feed.items, async (item) => {
        item = await processRawRssItem(item);
        return item;
    });
    return filings;
};