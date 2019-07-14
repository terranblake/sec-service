const { filingDocuments, filings: Filings } = require('../models');
const { getMetadata } = require('./filings');

module.exports.parseFilingDocumentsFromFiling = async (filingId) => {
	const { refId, company, _id } = await Filings.model
		.findOne({ _id: filingId })
		.lean()
		.populate({ path: 'company' });

	logs(`parsing filing ${filing} for ${company.ticker || company._id}`);

    let documents = await this.getMetadata(ticker, filing.refId);
	documents = await formatFilingDocuments(documents, company, filing);
	documents = filingDocuments.createAll(documents);
	
	return documents;
}

module.exports.getMetadata = (ticker, accessionNumber) => {
    const config = require('config');
    // TODO :: Add metadata-service to encrypted config
    const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';
    const endpoint = `${metadataService}/documents?ticker=${ticker}&accessionNumber=${accessionNumber}`;

    return new Promise((resolve, reject) => {
        let data = "";
        request
            .get(endpoint)
            .on('response', (response) => {
                logs(`retrieving metadata for ${accessionNumber}`);
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logs(`retrieved metadata for ${accessionNumber}`);
                    data = JSON.parse(data);
                    resolve(data);
                });
            })
            .on('error', (err) => reject(err));
    });
}