const { filings, facts } = require('../models');
const { validationReducer } = require('../controllers/companies');
const {
    download,
    processExtension,
    scrapeFilingFromSec,
    scrapeFilingFromRssItem
} = require('../utils/raw-data-helpers');
const gcp = require('../utils/gcp');
const { fetchLinks } = require('../utils/common-enums');
const { logs, errors } = require('../utils/logging');
const { rss, taxonomyExtension } = require('../utils/parser-options');

const getFilingFromSource = async function (parser, company) {
    let feed = await parser.parseURL(company.url);

    for (let key in feed.items) {
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
            logs(`retrieved filing from ${company.source} rss feed company ${company.ticker} accessionNumber ${item.accessionNumber}`);
            const filing = await filings.create(item);

            if (filing) {
                logs(`saved filing ${filing._id} from ${company.source} rss feed company ${company.ticker} accessionNumber ${item.accessionNumber}`);
                // gcp.pubsub.publish('UnprocessedFilings', filing._id);
                await parseOne(filing._id);
            } else {
                errors(`could not create filing from ${company.source} rss feed company ${company.ticker} accessionNumber ${item.accessionNumber}`);
            }
        }
    };
}

const parseOne = async function (filing) {
    const { taxonomyExtensions, company, _id } = await filings.model
        .findOne({ _id: filing }, { taxonomyExtensions: 1 })
        .lean()
        .populate({ path: 'taxonomyExtensions' })
        .populate({ path: 'company' });

    logs(`parsing filing ${filing} for ${company.ticker || company._id}`);

    for (let extension in taxonomyExtensions) {
        extension = taxonomyExtensions[extension];
        const { url, type } = extension;

        let elements = await download(url, taxonomyExtension, true);
        const processedFacts = await processExtension(_id, company._id, type, elements);
    }

    return taxonomyExtensions;
}

// TODO :: Update encrypted config to include this
// const pubsubEnabled = config.get('google-cloud.pub-sub.enabled');
module.exports.fetch = async function (source, tickers, type) {
    let Parser = require('rss-parser');
    let parser = new Parser(rss);

    let companies = [{ url: fetchLinks.sec.all }];

    // create url for each rss feed
    if (tickers) {
        companies = await validationReducer(tickers);
        companies = companies.map(c => {
            c['url'] = fetchLinks[source].by_cik(c.ticker, type);
            c.source = source;
            return c;
        });
    }

    for (let company in companies) {
        company = companies[company];
        logs(`processing rss feed from ${source} for ${company.ticker}`);
        await getFilingFromSource(parser, company);
    }

    return companies;
};

module.exports.parseOne = parseOne;