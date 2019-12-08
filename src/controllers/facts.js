const { readFile } = require('fs');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const facts = require('../models/facts');
const filingDocuments = require('../models/filingDocuments');

const { logs, errors } = require('../utils/logging');
const { download } = require('../utils/raw-data-helpers')
const { formatContexts, formatFacts, formatUnits } = require('../utils/filing-document-helpers');
const { filingDocument: filingDocumentParserOptions } = require('../utils/parser-options');

const readFileAsync = promisify(readFile);
const parseStringAsync = promisify(parseString);

module.exports.parseFromFiling = async (filingId) => {
	const documents = await filingDocuments.model
		.find({ filing: filingId, type: 'instance' })
		.lean()
		.populate({ path: 'company' });
	let factIds = [];

	logs(`found ${documents.length} filingDocuments to crawl for facts`);

	for (let document of documents) {
		const { fileUrl, company, status, statusReason, _id } = document;
		let elements;

		if (status === 'crawling' || status === 'crawled') {
			errors(`skipping crawling filingDocument ${_id} for ${company._id} because filingDocument is being crawled or was already crawled`);
			continue;
		}

		// read from local archive if exists
		if (status === 'downloaded' && statusReason) {
			logs(`filingDocument ${_id} loaded from local archive since it has been downloaded company ${company} filing ${filingId}`);
			elements = await readFileAsync(statusReason);
		// otherwise download the document again
		} else {
			logs(`filingDocument ${_id} downloaded from source since it has not been downloaded company ${company} filing ${filingId}`);
			elements = await download(fileUrl);
		}

		elements = await parseStringAsync(elements, filingDocumentParserOptions);
		elements = elements["xbrli:xbrl"] || elements.xbrl;

		await filingDocuments.model.findOneAndUpdate({ _id: document._id }, { status: 'crawling' });

		// format units
		let rawUnits = elements["xbrli:unit"] || elements.unit;;
		validUnits = await formatUnits(rawUnits, filingId, company);

		if (!validUnits || Array.isArray(validUnits) && !validUnits.length) {
			errors('no units returned from unit formatter. bailing!');
			return;
		}

		// TODO :: this probably won't work for everything
		let rawContexts = elements['xbrli:context'] || elements.context;
		let newContexts = await formatContexts(rawContexts, filingId, company);

		// format facts
		const newFacts = await formatFacts(elements, newContexts, validUnits, filingId, company);
		for (let fact of newFacts) {
			await facts.model.create(fact);
		}

		await filingDocuments.model.findOneAndUpdate({ _id: document._id }, { status: 'crawled' });
	}

	return factIds;
}