const { filingDocuments, filings: Filings } = require('../models');
const filings = require('./filings');

module.exports.parseFilingDocumentsFromFiling = async (filingId) => {
	const { refId, company, _id } = await Filings.model
		.findOne({ _id: filingId })
		.lean()
		.populate({ path: 'company' });

	logs(`parsing filing ${filing} for ${company.ticker || company._id}`);

    let documents = await filings.getMetadata(ticker, filing.refId);
	documents = await formatFilingDocuments(documents, company, filing);
	documents = filingDocuments.createAll(documents);
	
	return documents;
}