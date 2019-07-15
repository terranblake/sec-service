const { filingDocuments } = require('../controllers');

module.exports.mongodb = {
	filings: [
		{
			name: 'UnprocessedFilings',
			handler: filingDocuments.parseFilingDocumentsFromFiling,
			filters: [{ status: 'unprocessed' }]
		},
	]
}

// {
// 	DATABASE: {
// 		COLLECTION: [{
// 			FIELD: [{ $exists: true, $elemMatch: { FIELDPATH: [VALUE] } }]
// 		}]
// 	}
// }