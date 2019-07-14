const { filingDocuments, facts } = require('../models');
const { download } = require('../utils/raw-data-helpers')
const { formatContexts, formatFacts, formatUnits } = require('./filing-document-helpers');
const { filingDocument } = require('../utils/parser-options');

module.exports.parseFromFiling = (filingId) => {
	const documents = await filingDocuments.model
		.find({ filing: filingId })
		.lean()
		.populate({ path: 'company' });

	for (let document of documents) {
		const { fileUrl, type, company } = document;

		let elements = await download(fileUrl, filingDocument, true);
		elements = elements["xbrli:xbrl"] || elements.xbrl;

		// don't support other types until
		//  instance parsing is stable
		if (type === 'instance') {
			// format units
			let rawUnits = elements["xbrli:unit"] || elements.unit;;
			validUnits = await formatUnits(rawUnits, filingId, company);

			// TODO :: this probably won't work for everything
			let rawContexts = elements['xbrli:context'] || elements.context;
			let newContexts = await formatContexts(rawContexts, filingId, company);

			// format facts
			let newFacts = await formatFacts(elements, newContexts, validUnits, filingId, company);
			for (let fact of newFacts) {
				await facts.create(fact);
			}

			return newFacts;
		}
	}

	return documents;
}