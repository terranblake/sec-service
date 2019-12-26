const request = require('request');
const { promisify } = require('util');
const { writeFile, existsSync, mkdirSync } = require('fs');

const requestAsync = promisify(request);
const writeFileAsync = promisify(writeFile);

const { Company, FilingDocument, Filing } = require('@postilion/models');
const { logger } = require('@postilion/utils');

const archiveLocation = process.env.ARCHIVE_LOCATION;

class FilingDocumentManager {
	constructor() { }

	async downloadNewFilingDocuments(job) {
		const { _id, company, refId } = job.data;

		const { ticker } = await Company.findOne({ _id: company }).lean();
		await Filing.findOneAndUpdate({ _id }, { status: 'downloading' });

		let documents = await FilingDocument.find({
			company,
			filing: _id,
			status: { $nin: ['crawling', 'crawled', 'downloading'] }
		}).lean();

		if (!documents.length) {
			logger.warn(`no documents found for filing ${_id} company ${company}`);
			return;
		}

		const tickerPath = `${archiveLocation}/${ticker}`;
		if (!existsSync(tickerPath)) {
			logger.info(`creating path ${tickerPath}`);
			await mkdirSync(tickerPath);
		}

		const filePath = `${tickerPath}/${refId}`
		if (!existsSync(filePath)) {
			logger.info(`creating path ${filePath}`);
			await mkdirSync(filePath);
		}

		// if one of these fails, we want the queue to fail
		// and let us retry. if the filing document was finished 
		for (let document of documents) {
			await FilingDocumentManager.downloadFilingDocument(document._id, filePath);
		}

		// let other subscribers know that this filing has been downloaded
		// if they rely on downloading from remote or local storage, this
		// would give them a way to know that the filing is completely
		// finished with downloading all filing documents
		await Filing.findOneAndUpdate({ _id }, { status: 'downloaded' });
	}

	static async downloadFilingDocument(filingDocumentId, filePath) {
		const document = await FilingDocument.findOne({ _id: filingDocumentId });
		const { _id, fileName, fileUrl, company, filing, status } = document;
	
		// is the document in a downloaded status and the file exists
		if (status === 'downloaded' && existsSync(filePath)) {
			logger.info(`skipping previously downloaded filingDocument ${_id} company ${company} filing ${filing}`);
			return document;
		}
	
		logger.info(`starting download filingDocument ${_id} to local archive company ${company} filing ${filing}`);
		await FilingDocument.findOneAndUpdate({ _id: _id }, { status: 'downloading' });
	
		const savePath = `${filePath}/${fileName}`;
		const rawFile = await requestAsync({ url: fileUrl, method: 'GET' });
	
		await writeFileAsync(savePath, rawFile);
	
		logger.info(`finished download of filingDocument ${_id} to local archive company ${company} filing ${filing}`);
		await FilingDocument.findOneAndUpdate({ _id }, { status: 'downloaded', statusReason: savePath });
	}
}

module.exports = FilingDocumentManager;