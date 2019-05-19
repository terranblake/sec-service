const { filings, facts, taxonomyExtensions } = require('../models');
const {
    createFilingFromRssItem,
    download,
    saveExtension,
    processExtension,
    scrapeFilingFromSec
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

    let urls = [fetchLinks.sec.all];
    if (tickers) {
        urls = tickers.split(',').map(t => fetchLinks[source].by_cik(t, type))
    }

    for (let url in urls) {
        url = urls[url];
        logs(`processing rss feed at ${url}`);
        await processRssFeed(parser, url);
    }

    return feed.items.length;
};

async function processRssFeed(parser, url) {
    let feed = await parser.parseURL(url);

    for (const key in Object.keys(feed.items)) {
        let item = feed.items[key];
        const filing = item.filing && 
            await createFilingFromRssItem(item) ||
            await scrapeFilingFromSec(item);

        // TODO :: Make a topic resolver for a
        //          decoupled topic approach
        // TODO :: Use config to toggle pubsub
        //          functionality for filing processors
        if (filing) {
            gcp.pubsub.publish('UnprocessedFilings', filing);
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