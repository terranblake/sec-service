const { writeFile, existsSync, mkdirSync, readFile } = require('fs');
const { promisify } = require('util');
const on = require('await-on');
const { parseString } = require('xml2js');

const filingDocuments = require('../models/filingDocuments');
const filings = require('../models/filings');
const companies = require('../models/companies');
const facts = require('../models/facts');

const { logs, errors } = require('../utils/logging');
const { download } = require('../utils/raw-data-helpers')
const { formatContexts, formatFacts, formatUnits } = require('../utils/filing-document-helpers');
const { filingDocument: filingDocumentParserOptions } = require('../utils/parser-options');

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
		// todo: ONLY DOWNLOADING INSTANCE DOCUMENTS
		// we only want to download filing documents which we haven't already
		// and which we havent already crawled since that's later in the pipeline
		let documents = await filingDocuments.model.find({
			company: _id,
			filing: filing._id,
			type: 'instance',
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

	const updatedDocument = await filingDocuments.model.findOneAndUpdate({ _id: _id }, {
		status: 'downloaded',
		statusReason: savePath
	});

	logs(`finished download filingDocument ${updatedDocument._id} to local archive company ${company} filing ${filing}`);
	return updatedDocument;
}

module.exports.crawlByCompany = async (companyId) => {
	const documents = await filingDocuments.model
		.find({ company: companyId, type: 'instance' })
		.lean();

	logs(`found ${documents.length} filingDocuments to crawl for facts`);

	let crawledDocuments = [];
	for (let document of documents) {
		const [crawlError, crawledDocument] = await on(this.crawlById(document._id));
		if (crawlError) {
			errors(crawlError);
			continue;
		}

		crawledDocuments.push(crawledDocument);
	}

	return crawledDocuments;
}

module.exports.crawlByFiling = async (filingId) => {
	const documents = await filingDocuments.model
		.find({ filing: filingId, type: 'instance' })
		.lean();

	logs(`found ${documents.length} filingDocuments to crawl for facts`);

	let crawledDocuments = [];
	for (let document of documents) {
		const [crawlError, crawledDocument] = await on(this.crawlById(document._id));
		if (crawlError) {
			errors(crawlError);
			continue;
		}

		crawledDocuments.push(crawledDocument);
	}

	return crawledDocuments;
}

module.exports.crawlById = async (filingDocumentId) => {
	const document = await filingDocuments.model.findById(filingDocumentId);
	const { fileUrl, company, status, statusReason, _id, filing } = document;
	let elements;

	// // common crawling pattern. checking current status if the
	// // item has already been crawled or is currently being crawled
	// if (status === 'crawling' || status === 'crawled') {
	// 	throw new Error(`skipping crawling filingDocument ${_id} for ${company._id} because filingDocument is ${status}`);
	// }

	// read from local archive if exists
	if (['downloaded', 'crawled'].includes(status)) {
		logs(`filingDocument ${_id} loaded from local archive since it has been downloaded company ${company} filing ${filing}`);
		elements = await readFileAsync(statusReason);
		// otherwise download the document again
	} else {
		logs(`filingDocument ${_id} downloaded from source since it has not been downloaded company ${company} filing ${filing}`);
		elements = await download(fileUrl);
	}

	elements = await parseStringAsync(elements, filingDocumentParserOptions);
	elements = elements["xbrli:xbrl"] || elements.xbrl;

	await filingDocuments.model.findOneAndUpdate({ _id: document._id }, { status: 'crawling' });

	let rawUnits = elements["xbrli:unit"] || elements.unit;;
	validUnits = await formatUnits(rawUnits);

	if (!validUnits || Array.isArray(validUnits) && !validUnits.length) {
		throw new Error('no units returned from unit formatter. bailing!');
	}

	// contexts are objects that define a segmented portions of a
	// gaap identifier value. e.g. countries/regions
	const rawContexts = elements['xbrli:context'] || elements.context;
	const newContexts = await formatContexts(rawContexts);

	const newFacts = await formatFacts(elements, newContexts, validUnits, filing, company);
	for (let fact of newFacts) {
		await facts.model.create(fact);
	}

	const updatedDocument = await filingDocuments.model.findOneAndUpdate({ _id: document._id }, { status: 'crawled' });
	logs(`finished crawling filingDocument ${updatedDocument._id} for facts company ${company} filing ${filing}`);
	return updatedDocument;
}