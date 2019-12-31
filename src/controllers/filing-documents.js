const { writeFile, existsSync, mkdirSync, readFile } = require('fs');
const { promisify } = require('util');
const on = require('await-on');
const { parseString } = require('xml2js');

const { Company, Filing, FilingDocument } = require('@postilion/models');

const { enums, logger, parserOptions } = require('@postilion/utils');
const { filingDocumentParsingOrder } = enums;
const { filingDocument: filingDocumentParserOptions } = parserOptions;

const { download } = require('../utils/raw-data-helpers');
const filingDocumentParsers = require('../utils/filing-document-parsers');

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const parseStringAsync = promisify(parseString);

const archiveLocation = process.env.ARCHIVE_LOCATION;

module.exports.downloadByCompany = async (company) => {
	if (process.env.NODE_ENV === 'production') {
		logger.warn('skipping downloading filing documents because NODE_ENV is production');
		return;
	}

	// get all filings for the provided company
	const { _id, ticker } = await Company.findOne({ _id: company }).lean();
	const tickerPath = `${archiveLocation}/${ticker}`;

	if (!existsSync(tickerPath)) {
		console.log(`creating path ${tickerPath}`);
		await mkdirSync(tickerPath);
	}

	const filingObjs = await Filing.find({ company: _id }).lean();

	for (let filing of filingObjs) {
		// todo: download all documents related to the type of filing being pulled
		// we only want to download filing documents which we haven't already
		// and which we havent already crawled since that's later in the pipeline
		let documents = await FilingDocument.find({
			company: _id,
			filing: filing._id,
			type: { $in: Object.keys(filingDocumentParsers) },
			status: { $nin: ['crawling', 'crawled', 'downloading', 'downloaded'] }
		}).lean();

		if (!documents.length) {
			continue;
		}

		const filePath = `${tickerPath}/${filing.refId}`;
		if (!existsSync(filePath)) {
			logger.info(`creating path ${filePath}`);
			await mkdirSync(filePath);
		}

		for (let document of documents) {
			const [downloadError] = await on(this.downloadById(document._id, filePath));
			if (downloadError) {
				logger.error(downloadError);
				continue;
			}
		}
	}
}

module.exports.downloadById = async (filingDocumentId, filePath) => {
	const document = await FilingDocument.findById(filingDocumentId);
	const { _id, fileName, fileUrl, company, filing, status } = document;

	// is the document in a downloaded status and the file exists
	if (['downloaded', 'downloading'].includes(status) && existsSync(filePath)) {
		logger.info(`skipping previously downloaded filingDocument ${_id} company ${company} filing ${filing}`);
		return document;
	}

	await FilingDocument.findOneAndUpdate({ _id: _id }, { status: 'downloading' });
	logger.info(`starting download filingDocument ${_id} to local archive company ${company} filing ${filing}`);

	const savePath = `${filePath}/${fileName}`;
	const rawFile = await download(fileUrl);

	await writeFileAsync(savePath, rawFile);
	const updateObject = { status: 'downloaded', statusReason: savePath };

	const updatedDocument = await FilingDocument.findOneAndUpdate({ _id }, updateObject);

	logger.info(`finished download filingDocument ${updatedDocument._id} to local archive company ${company} filing ${filing}`);
	return updatedDocument;
}

module.exports.crawlByCompany = async (companyId) => {
	let documents = await FilingDocument
		.find({
			company: companyId,
			type: { $in: Object.keys(filingDocumentParsers) },
		})
		.lean();

	logger.info(`found ${documents.length} filingDocuments to crawl for facts`);

	let crawledDocuments = [];
	for (let i of Object.keys(filingDocumentParsingOrder)) {
		const documentType = filingDocumentParsingOrder[i];

		const filteredDocuments = documents.filter(d => d.type === documentType);
		if (!filteredDocuments.length) {
			continue;
		}

		for (let document of filteredDocuments) {
			const [crawlError, crawledDocument] = await on(this.crawlById(document._id));
			if (crawlError) {
				logger.error(crawlError);
				continue;
			}

			crawledDocuments.push(crawledDocument);
		}
	}

	return crawledDocuments;
}

module.exports.crawlByFiling = async (filingId) => {
	const documents = await FilingDocument
		.find({
			filing: filingId,
			type: { $in: Object.keys(filingDocumentParsers) }
		})
		.lean();

	logger.info(`found ${documents.length} filingDocuments to crawl for facts`);

	let crawledDocuments = [];
	for (let i of Object.keys(filingDocumentParsingOrder)) {
		const documentType = filingDocumentParsingOrder[i];

		const filteredDocuments = documents.filter(d => d.type === documentType);
		if (!filteredDocuments.length) {
			continue;
		}

		for (let document of filteredDocuments) {
			const [crawlError, crawledDocument] = await on(this.crawlById(document._id));
			if (crawlError) {
				logger.error(crawlError);
				continue;
			}

			crawledDocuments.push(crawledDocument);
		}
	}

	return crawledDocuments;
}

module.exports.crawlById = async (filingDocumentId) => {
	const document = await FilingDocument.findById(filingDocumentId);
	const { fileUrl, company, status, statusReason, _id, filing, type } = document;
	let elements;

	// read from local archive if exists
	if (['downloaded', 'crawled'].includes(status)) {
		logger.info(`filingDocument ${_id} loaded from local archive since it has been downloaded company ${company} filing ${filing}`);
		elements = await readFileAsync(statusReason);
		// otherwise download the document again
	} else {
		logger.info(`filingDocument ${_id} downloaded from source since it has not been downloaded company ${company} filing ${filing}`);
		elements = await download(fileUrl);
	}

	await FilingDocument.findOneAndUpdate({ _id }, { status: 'crawling' });
	elements = await parseStringAsync(elements, filingDocumentParserOptions);

	// get the parser associated with the type of filing document
	const filingDocumentParser = filingDocumentParsers[type];
	await filingDocumentParser(elements, filing, company);

	const updatedDocument = await FilingDocument.findOneAndUpdate({ _id }, { status: 'crawled' });
	logger.info(`finished crawling filingDocument ${updatedDocument._id} for facts company ${company} filing ${filing}`);
	return updatedDocument;
}