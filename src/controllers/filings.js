const on = require('await-on');

const {
    enums,
    logger,
    parserOptions
} = require('@postilion/utils');

const { supportedRegulators } = enums;
const { rss } = parserOptions;

const { Filing, FilingDocument } = require('@postilion/models');

// todo: move any request to another service behind
// a queue to preserve requests and track events
const { getMetadata } = require('../utils/metadata');

const { formatFilingDocuments, parseRssEntry } = require('../utils/raw-data-helpers');
const { validationReducer } = require('../controllers/companies');

module.exports.downloadByCompany = async (companyId) => {
	const filingsObj = await Filing.find({ company: companyId }).lean();

	logger.info(`found ${filingsObj.length} filings to crawl for filing documents`);

	let crawledFilings = [];
	for (let filing of filingsObj) {
		const [crawlError] = await on(this.downloadById(filing._id));
		if (crawlError) {
			logger.error(crawlError);
			continue;
		}

		crawledFilings.push(filing);
	}

	return crawledFilings;
}

module.exports.downloadById = async (filingId) => {
    const { refId, company, _id, status } = await Filing
        .findOne({ _id: filingId })
        .lean()
        .populate({ path: 'company' });

    if (['downloading', 'downloaded'].includes(status)) {
        logger.error(`skipping downloaded or currently downloading filing ${_id} company ${company._id}`);
        return [];
    }

    logger.info(`downloading documents metadata for filing ${_id} company ${company._id}`);
    await Filing.findOneAndUpdate({ _id }, { status: 'downloading' });

    let documents = await getMetadata('documents', company.ticker, refId);
    documents = await formatFilingDocuments(documents, company, filingId);

    logger.info(`downloaded documents metadata for company ${company.ticker} cik ${company.cik} refId ${refId}`);
    await Filing.findOneAndUpdate({ _id }, { status: 'downloaded' });

    for (let i in documents) {
        const document = documents[i];
        const foundDocument = await FilingDocument.findOne({ filing: _id, company: company._id, type: document.type });
        if (foundDocument) {
            errors(`skipping creating duplicate filing document filing ${_id} company ${company._id} type ${document.type}`);
            continue;
        }

        documents[i] = await FilingDocument.create(documents[i]);
    }

    // // todo: the improved design would be to treat every Collection as
    // // the exact same thing and simply direct the crawling type based on
    // // the collection. define children/leaf nodes by Collection, crawl 
    // // the current node to find any metadata and all children/leaf nodes,
    // // then use the Collection-specific crawler on all children
    // if (options.children) {
    //     await crawlByFiling(filingId);

    //     await Filing.findOneAndUpdate({ _id }, { status: 'crawled' });
    //     logger.info(`updating filing ${_id} status to crawled because all documents have been crawled company ${company}`);

    //     // we want to return the most updated reference to these objects
    //     // to avoid confusion
    //     for (let i in documents) {
    //         documents[i] = await FilingDocument.findById(documents[i]._id);
    //     }
    // } else {
    //     await Filing.findOneAndUpdate({ _id }, { status: 'seeded' });
    //     logger.info(`updating filing ${_id} status to seeded because all documents have been created company ${company}`);
    // }

    return documents;
}

// todo :: Update encrypted config to include: const pubsubEnabled = config.get('google-cloud.pub-sub.enabled');
module.exports.parseFilingRssFeed = async function (source, tickers, type) {
    let Parser = require('rss-parser');
    let parser = new Parser(rss);

    let companies = [{ url: supportedRegulators.sec.all }];

    if (tickers) {
        companies = await validationReducer(tickers);
        companies = companies.map(c => {
            c.url = supportedRegulators[source].by_cik(c.ticker, type);
            c.source = source;
            return c;
        });
    }

    let results = {};
    for (let company in companies) {
        company = companies[company];
        logger.info(`processing rss feed from ${source} for ${company.ticker}`);
        results[company._id] = await parseFromSource(parser, company);
    }

    return results;
};

const parseFromSource = async function (parser, company) {
    let feed = await parser.parseURL(company.url);

    let newFilings = [];
    for (let entry of feed.items) {
        const accessionNumber = entry.id.split('accession-number=')[1];

        const foundFiling = await Filing.findOne({ refId: accessionNumber });
        if (foundFiling) {
            logger.info(`skipping already parsed filing ${foundFiling._id} refId ${accessionNumber} company ${foundFiling.company}`);
            continue;
        }

        const parsedRssEntry = await parseRssEntry(entry, accessionNumber, company);
        if (!parsedRssEntry) {
            errors(`raw filing returned null after scraping from SEC. this should be investigated company ${JSON.stringify(company)}`);
            continue;
        }

        logger.info(`retrieved filing from ${company.source} rss feed company ${company.ticker} accessionNumber ${accessionNumber}`);
        const [creationError, filing] = await on(Filing.create(parsedRssEntry));
        if (creationError) {
            errors(creationError);
        } else {
            newFilings.push(filing);
        }
    };

    return newFilings;
}