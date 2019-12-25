const { Company, Filing, FilingDocument } = require('@postilion/models');

const { rssParsers } = require('@postilion/utils');
const { getLatestFilingFeed } = rssParsers;

class FilingManager {
	constructor() { }

	async syncSecFilingFeedByTicker(job) {
		const { source, ticker } = job.attrs;

		if (!ticker) {
			return res.status(401).send({ err: 'No ticker provided.' });
		}

		// fetch all filings for company
		const feedEntries = await getLatestFilingFeed(ticker, source);

		// create filing from each entry
		for (let entry of feedEntries) {
			await Filing.create(entry);
		}
	}

	async getDocumentsForNewFiling(job) {
		const { _id, company } = job.data;

		// get company for this filing
		const companyObj = Company.findOne({ _id: company }).lean();
		const { _id: companyId, cik, ticker } = companyObj;

		if (['seeded', 'downloading', 'downloaded'].includes(status)) {
			logger.error(`skipping downloaded or currently downloading filing ${_id} company ${companyId}`);
			return [];
		}

		logger.info(`downloading documents metadata for filing ${_id} company ${companyId}`);
		await Filing.findOneAndUpdate({ _id }, { status: 'seeding' });

		let documents = await metadata(FilingDocument, company.ticker, refId);
		documents = await formatFilingDocuments(documents, company, filingId);

		for (let i in documents) {
			const document = documents[i];
			const foundDocument = await FilingDocument.findOne({ filing: _id, company: companyId, type: document.type });
			if (foundDocument) {
				errors(`skipping creating duplicate filing document filing ${_id} company ${companyId} type ${document.type}`);
				continue;
			}

			documents[i] = await FilingDocument.create(documents[i]);
		}

		logger.info(`downloaded documents metadata for company ${ticker} cik ${cik} refId ${refId}`);
		await Filing.findOneAndUpdate({ _id }, { status: 'seeded' });
	}
}

module.exports = FilingManager;