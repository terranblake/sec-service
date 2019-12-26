const { Company, Filing, FilingDocument } = require('@postilion/models');
const { logger, metadata } = require('@postilion/utils');

const { formatFilingDocuments }  =require('../utils/raw-data-helpers');

const SecManager = require('./sec-manager');
const secManager = new SecManager();

class FilingManager {
	constructor() { }

	async syncSecFilingFeedByTicker(job) {
		const { _id, ticker } = job.data;
		if (!ticker) {
			throw new Error('no ticker found in job');
		}

		// fetch all filings for company
		const feedEntries = await secManager.getLatestFilingFeed(ticker);

		// create filing from each entry
		for (let entry of feedEntries) {
			await Filing.create(entry);
		}

		// update last synced filing date to now
		await Company.findOneAndUpdate({ _id }, { lastSyncedFilingsAt: new Date() });
	}

	async getDocumentsForNewFiling(job) {
		const { _id, company, status, refId } = job.data;

		// get company for this filing
		const companyObj = await Company.findOne({ _id: company }).lean();
		const { cik, ticker } = companyObj;

		if (['seeded', 'downloading', 'downloaded'].includes(status)) {
			logger.error(`skipping downloaded or currently downloading filing ${_id} company ${company}`);
			return [];
		}

		logger.info(`downloading documents metadata for filing ${_id} company ${company}`);
		await Filing.findOneAndUpdate({ _id }, { status: 'seeding' });

		let documents = await metadata(FilingDocument, ticker, refId);
		documents = await formatFilingDocuments(documents, company, _id);

		for (let i in documents) {
			const document = documents[i];
			const foundDocument = await FilingDocument.findOne({ filing: _id, company, type: document.type });
			if (foundDocument) {
				errors(`skipping creating duplicate filing document filing ${_id} company ${company} type ${document.type}`);
				continue;
			}

			documents[i] = await FilingDocument.create(documents[i]);
		}

		logger.info(`downloaded documents metadata for company ${ticker} cik ${cik} refId ${refId}`);
		await Filing.findOneAndUpdate({ _id }, { status: 'seeded' });
	}
}

module.exports = FilingManager;