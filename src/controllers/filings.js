const request = require("request");

const { scrapeFilingFromSec, scrapeFilingFromRssItem } = require('../utils/raw-data-helpers');
const { supportedRegulators } = require('../utils/common-enums');
const { logs, errors } = require('../utils/logging');
const { rss } = require('../utils/parser-options');
const on = require('await-on');

const filings = require('../models/filings');
const filingDocuments = require('../models/filingDocuments');

const { formatFilingDocuments } = require('../utils/raw-data-helpers');
const { getMetadata } = require('../utils/metadata');

const { crawlByFiling } = require('../controllers/filingDocuments');
const { validationReducer } = require('../controllers/companies');

module.exports.crawlByCompany = async (companyId) => {
	const filingsObj = await filings.model
		.find({ company: companyId })
		.lean();

	logs(`found ${filingsObj.length} filings to crawl for filing documents`);

	let crawledFilings = [];
	for (let filing of filingsObj) {
		const [crawlError] = await on(this.crawlById(filing._id));
		if (crawlError) {
			errors(crawlError);
			continue;
		}

		crawledFilings.push(filing);
	}

	return crawledFilings;
}

module.exports.crawlById = async (filingId, options = {}) => {
    const { refId, company, _id, status } = await filings.model
        .findOne({ _id: filingId })
        .lean()
        .populate({ path: 'company' });

    if (status === 'crawling' || status === 'crawled') {
        errors(`skipping crawling filing ${_id} for ${company._id} because filing is being crawled or was previously crawled`);
        return [];
    }

    logs(`downloading documents metadata for filing ${_id} company ${company._id}`);
    await filings.model.findOneAndUpdate({ _id }, { status: 'downloading' });

    let documents = await getMetadata('documents', company.ticker, refId);
    documents = await formatFilingDocuments(documents, company, filingId);

    logs(`downloaded documents metadata for company ${company.ticker} cik ${company.cik} refId ${refId}`);
    await filings.model.findOneAndUpdate({ _id }, { status: 'downloaded' });

    for (let i in documents) {
        documents[i] = await filingDocuments.model.create(documents[i]);
    }

    // todo: the improved design would be to treat every Collection as
    // the exact same thing and simply direct the crawling type based on
    // the collection. define children/leaf nodes by Collection, crawl 
    // the current node to find any metadata and all children/leaf nodes,
    // then use the Collection-specific crawler on all children
    if (options.children) {
        await crawlByFiling(filingId);

        await filings.model.findOneAndUpdate({ _id }, { status: 'crawled' });
        logs(`updating filing ${_id} status to crawled because all documents have been crawled company ${company}`);

        // we want to return the most updated reference to these objects
        // to avoid confusion
        for (let i in documents) {
            documents[i] = await filingDocuments.model.findById(documents[i]._id);
        }
    } else {
        await filings.model.findOneAndUpdate({ _id }, { status: 'seeded' });
        logs(`updating filing ${_id} status to seeded because all documents have been created company ${company}`);
    }

    return documents;
}

// todo :: Update encrypted config to include: const pubsubEnabled = config.get('google-cloud.pub-sub.enabled');
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
        const filing = await filings.model.create(item);
        newFilings.push(filing);
    };

    return newFilings;
}