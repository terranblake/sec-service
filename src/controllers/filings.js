const on = require('await-on');

const { logger, metadata } = require('@postilion/utils');
const { Filing, FilingDocument } = require('@postilion/models');

const { formatFilingDocuments } = require('../utils/raw-data-helpers');

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

    let documents = await metadata(FilingDocument, company.ticker, refId);
    documents = await formatFilingDocuments(documents, company, filingId);

    for (let i in documents) {
        const document = documents[i];
        const foundDocument = await FilingDocument.findOne({ filing: _id, company: company._id, type: document.type });
        if (foundDocument) {
            errors(`skipping creating duplicate filing document filing ${_id} company ${company._id} type ${document.type}`);
            continue;
        }

        documents[i] = await FilingDocument.create(documents[i]);
    }

    logger.info(`downloaded documents metadata for company ${company.ticker} cik ${company.cik} refId ${refId}`);
    await Filing.findOneAndUpdate({ _id }, { status: 'downloaded' });

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