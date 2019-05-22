const { filings } = require('../models');
const { validationReducer } = require('../controllers/companies');
const {
    download,
    saveExtension,
    processExtension,
    scrapeFilingFromSec,
    scrapeFilingFromRssItem
} = require('../utils/raw-data-helpers');
const gcp = require('../utils/gcp');
const { fetchLinks } = require('../utils/common-enums');
const { logs } = require('../utils/logging');
const { rss, taxonomyExtension } = require('../utils/parser-options');
const config = require('config');

// TODO :: Update encrypted config to include this
// const pubsubEnabled = config.get('google-cloud.pub-sub.enabled');
module.exports.fetch = async function (source, tickers, type) {
    let Parser = require('rss-parser');
    let parser = new Parser(rss);

    let companies = [{ url: fetchLinks.sec.all }];

    // create url for each rss feed
    if (tickers) {
        companies = await validationReducer(tickers.split(','));
        companies = companies.map(c => {
            c['url'] = fetchLinks[source].by_cik(c.ticker, type);
            return c;
        });
    }
 
    // process each rss feed
    for (let company in companies) {
        company = companies[company];
        logs(`processing rss feed from ${source} for ${company.name}`);
        await processRssFeed(parser, company);
    }

    return companies;
};

async function processRssFeed(parser, company) {
    let feed = await parser.parseURL(company.url);

    for (const key in Object.keys(feed.items)) {
        let item = feed.items[key];

        if (item.filing) {
            logs('scraping filing from rss item');
            item = await scrapeFilingFromRssItem(item);
        } else {
            logs('scraping filing from sec');
            item = await scrapeFilingFromSec(item, company);
        }

        // TODO :: Make a topic resolver for a
        //          decoupled topic approach
        // TODO :: Use config to toggle pubsub
        //          functionality for filing processors
        if (item) {
            // gcp.pubsub.publish('UnprocessedFilings', item);
            logs(`prepared filing from rss feed ${item.accessionNumber}`);
        }
    };
}

module.exports.parseOne = async function (filing) {
    const { taxonomyExtensions, company } = await filings.model
        .findOne({ _id: filing }, { taxonomyExtensions: 1 })
        .lean()
        .populate({ path: 'taxonomyExtensions' })
        .populate({ path: 'company' });

    logs(`parsing filing ${filing} for ${company.name || company._id}`);

    for (let extension in taxonomyExtensions) {
        extension = taxonomyExtensions[extension];
        const { url, extensionType } = extension;

        let elements = await download(url, taxonomyExtension, true);

        // TODO :: Remove this in favor of check that the
        //          accession number already exists in db
        saveExtension(extension.extensionType, elements);
        const facts = processExtension(filing, company._id, extensionType, elements);

    }

    return taxonomyExtensions;
}