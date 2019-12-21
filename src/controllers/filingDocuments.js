const { writeFile, existsSync, mkdirSync, readFile } = require('fs');
const { promisify } = require('util');
const on = require('await-on');
const { parseString } = require('xml2js');

const filingDocuments = require('../models/filingDocuments');
const filings = require('../models/filings');
const companies = require('../models/companies');

const { filingDocumentParsingOrder } = require('../utils/common-enums');
const { logs, errors } = require('../utils/logging');
const { download } = require('../utils/raw-data-helpers')
const { filingDocument: filingDocumentParserOptions } = require('../utils/parser-options');

const filingDocumentParsers = require('../utils/filing-document-parsers');

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const parseStringAsync = promisify(parseString);

const archiveLocation = process.env.ARCHIVE_LOCATION;

module.exports.downloadByCompany = async (company) => {
	// get all filings for the provided company
	const { _id, ticker } = await companies.model.findOne({ _id: company }).lean();
	const tickerPath = `${archiveLocation}/${ticker}`;

	if (!existsSync(tickerPath)) {
		console.log(`creating path ${tickerPath}`);
		await mkdirSync(tickerPath);
	}

	const filingObjs = await filings.model.find({ company: _id }).lean();
	let downloadResults = [];

	for (let filing of filingObjs) {
		// todo: download all documents related to the type of filing being pulled
		
		// we only want to download filing documents which we haven't already
		// and which we havent already crawled since that's later in the pipeline
		let documents = await filingDocuments.model.find({
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
			logs(`creating path ${filePath}`);
			await mkdirSync(filePath);
		}

		for (let document of documents) {
			const [downloadError, downloadedDocument] = await on(this.downloadById(document._id, filePath));
			if (downloadError) {
				errors(downloadError);
				continue;
			}

			downloadResults.push(downloadedDocument);
		}
	}

	return downloadResults;
}

module.exports.downloadById = async (filingDocumentId, filePath) => {
	const document = await filingDocuments.model.findById(filingDocumentId);
	const { _id, fileName, fileUrl, company, filing, status } = document;

	// is the document in a downloaded status and the file exists
	if (['downloaded', 'downloading'].includes(status) && existsSync(filePath)) {
		logs(`skipping previously downloaded filingDocument ${_id} company ${company} filing ${filing}`);
		return document;
	}

	await filingDocuments.model.findOneAndUpdate({ _id: _id }, { status: 'downloading' });
	logs(`starting download filingDocument ${_id} to local archive company ${company} filing ${filing}`);

	const savePath = `${filePath}/${fileName}`;
	const rawFile = await download(fileUrl);

	await writeFileAsync(savePath, rawFile);
	const updateObject = { status: 'downloaded', statusReason: savePath };

	const updatedDocument = await filingDocuments.model.findOneAndUpdate({ _id }, updateObject);

	logs(`finished download filingDocument ${updatedDocument._id} to local archive company ${company} filing ${filing}`);
	return updatedDocument;
}

module.exports.crawlByCompany = async (companyId) => {
	let documents = await filingDocuments.model
		.find({
			company: companyId,
			type: { $in: Object.keys(filingDocumentParsers) },
		})
		.lean();

	logs(`found ${documents.length} filingDocuments to crawl for facts`);

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
				errors(crawlError);
				continue;
			}

			crawledDocuments.push(crawledDocument);
		}
	}

	return crawledDocuments;
}

module.exports.crawlByFiling = async (filingId) => {
	const documents = await filingDocuments.model
		.find({
			filing: filingId,
			type: { $in: Object.keys(filingDocumentParsers) }
		})
		.lean();

	logs(`found ${documents.length} filingDocuments to crawl for facts`);

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
				errors(crawlError);
				continue;
			}

			crawledDocuments.push(crawledDocument);
		}
	}

	return crawledDocuments;
}

module.exports.crawlById = async (filingDocumentId) => {
	const document = await filingDocuments.model.findById(filingDocumentId);
	const { fileUrl, company, status, statusReason, _id, filing, type } = document;
	let elements;

	// read from local archive if exists
	if (['downloaded', 'crawled'].includes(status)) {
		logs(`filingDocument ${_id} loaded from local archive since it has been downloaded company ${company} filing ${filing}`);
		elements = await readFileAsync(statusReason);
		// otherwise download the document again
	} else {
		logs(`filingDocument ${_id} downloaded from source since it has not been downloaded company ${company} filing ${filing}`);
		elements = await download(fileUrl);
	}

	await filingDocuments.model.findOneAndUpdate({ _id }, { status: 'crawling' });
	elements = await parseStringAsync(elements, filingDocumentParserOptions);

	// get the parser associated with the type of filing document
	const filingDocumentParser = filingDocumentParsers[type];
	await filingDocumentParser(elements, filing, company);

	const updatedDocument = await filingDocuments.model.findOneAndUpdate({ _id }, { status: 'crawled' });
	logs(`finished crawling filingDocument ${updatedDocument._id} for facts company ${company} filing ${filing}`);
	return updatedDocument;
}