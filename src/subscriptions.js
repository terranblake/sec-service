// every service should define a single file that exports Array<Subscription>
// which defines how it interacts with each queue and any filters or options

const models = require('@postilion/models');
const { Operation } = require('@postilion/event-framework');

const FilingManager = require('./managers/filing-manager');
const filingManager = new FilingManager();

const FilingDocumentManager = require('./managers/filing-document-manager');
const filingDocumentManager = new FilingDocumentManager();

module.exports = [
    {
        // get the latest filing feed for a company from their
        // rss channel specifically for tracking filings
        name: 'SyncFilingsByTicker',
        model: models.Company,
        operation: Operation.named,
        handler: filingManager.syncSecFilingFeedByTicker,
        filters: [],
        options: {}
    },
    {
        name: 'GetFilingsForNewCompany',
        model: models.Company,
        operation: Operation.create,
        handler: filingManager.syncSecFilingFeedByTicker,
        filters: [],
        options: {}
    },
    {
        // get all filing documents associated with a new filing
        name: 'GetFilingDocumentsForFiling',
        model: models.Filing,
        operation: Operation.create,
        handler: filingManager.getDocumentsForFiling,
        filters: [
            {
                $match: {
                    status: 'unseeded'
                }
            }
        ],
        options: {}
    },
    {
        // download all filing documents for a filing when it's
        // filing documents have been found
        // todo: use local storage when running locally, or an
        // object storage provider if running in a container
        name: 'DownloadNewFilingDocuments',
        model: models.Filing,
        operation: Operation.update,
        handler: filingDocumentManager.downloadNewFilingDocuments,
        filters: [
            {
                $match: {
                    status: 'seeded'
                }
            }
        ],
        options: {}
    }
];