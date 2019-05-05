const logs = console.log.bind(console);
const errors = console.log.bind(console);
const { map } = require('lodash');
const { parseRssItem } = require('../utils/raw-data-helpers');

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

const fetchLatest = async () => {
    let feed = await parser.parseURL(fetchLinks['sec']);
    const filings = map(feed.items, parseRssItem);
    return filings;
};

module.exports = { fetchLatest };