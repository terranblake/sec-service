const { filingDocuments, filings: Filings } = require('../models')();
const { logs } = require('../utils/logging');
const { formatFilingDocuments } = require('../utils/raw-data-helpers');
const { getMetadata } = require('../utils/metadata');

module.exports.parseFilingDocumentsFromFiling = async (filingId) => {
	const { refId, company, _id } = await Filings.model
		.findOne({ _id: filingId })
		.lean()
		.populate({ path: 'company' });

	logs(`parsing filing ${_id} for ${company.ticker || company._id}`);

    let documents = await getMetadata('documents', company.ticker, refId);
    documents = await formatFilingDocuments(documents, company, filingId);

    logs(`retrieved ${documents.length} documents for company ${company.ticker} cik ${company.cik} refId ${refId}`);
    
    for (let i in documents) {
        documents[i] = await filingDocuments.create(documents[i]);
    }
	
	return documents;
}