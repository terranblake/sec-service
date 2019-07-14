const { validationReducer } = require('../controllers/companies');
const { scrapeFilingFromSec, scrapeFilingFromRssItem } = require('../utils/raw-data-helpers');
const request = require("request");
// const gcp = require('../utils/gcp');
const { supportedRegulators } = require('../utils/common-enums');
const { logs, errors } = require('../utils/logging');
const { rss } = require('../utils/parser-options');
const { filings } = require('../models')();

// TODO :: Update encrypted config to include this
// const pubsubEnabled = config.get('google-cloud.pub-sub.enabled');
module.exports.parseFromSourceByTickerAndType = async function (source, tickers, type) {
    let Parser = require('rss-parser');
    let parser = new Parser(rss);

    let companies = [{ url: supportedRegulators.sec.all }];

    if (tickers) {
        companies = await validationReducer(tickers);
        companies = companies.map(c => {
            c['url'] = supportedRegulators[source].by_cik(c.ticker, type);
            c.source = source;
            return c;
        });
    }

    let results = {};
    for (let company in companies) {
        company = companies[company];
        logs(`processing rss feed from ${source} for ${company.ticker}`);
        results[company._id] = await parseFromSource(source, parser, company);
    }

    return results;
};

const parseFromSource = async function (source, parser, company) {
    let feed = await parser.parseURL(company.url);

    let newFilings = [];
    for (let key in feed.items) {
        let item = feed.items[key];

        if (item.filing) {
            logs('scraping filing from rss item');
            item = await scrapeFilingFromRssItem(source, item);
        } else {
            logs('scraping filing from sec');
            item = await scrapeFilingFromSec(item, company);
        }

        if (!item) {
            continue;
        }

        logs(`retrieved filing from ${company.source} rss feed company ${company.ticker} accessionNumber ${item.accessionNumber}`);
        const filing = await filings.create(item);
        newFilings.push(filing);
    };

    return newFilings;
}