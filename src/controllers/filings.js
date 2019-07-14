const { validationReducer } = require('../controllers/companies');
const {
    download,
    scrapeFilingFromSec,
    scrapeFilingFromRssItem
} = require('../utils/raw-data-helpers');
const gcp = require('../utils/gcp');
const { supportedRegulators } = require('../utils/common-enums');
const { logs, errors } = require('../utils/logging');
const { rss } = require('../utils/parser-options');

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

module.exports.getMetadata = (ticker, accessionNumber) => {
    const config = require('config');
    // TODO :: Add metadata-service to encrypted config
    const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';
    const endpoint = `${metadataService}/filings?ticker=${ticker}&accessionNumber=${accessionNumber}`;

    return new Promise((resolve, reject) => {
        let data = "";
        request
            .get(endpoint)
            .on('response', (response) => {
                logs(`retrieving metadata for ${accessionNumber}`);
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logs(`retrieved metadata for ${accessionNumber}`);
                    data = JSON.parse(data);
                    resolve(data);
                });
            })
            .on('error', (err) => reject(err));
    });
}

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

        if (item) {
            logs(`retrieved filing from ${company.source} rss feed company ${company.ticker} accessionNumber ${item.accessionNumber}`);
            const filing = await filings.create(item);
            newFilings.push(filing);
        }
    };

    return newFilings;
}