const { each } = require('lodash');

var express = require('express')
var router = express.Router({ mergeParams: true });

const { loadCompaniesFromJson } = require('../utils/raw-data-helpers');
const { logs } = require('../utils/logging');

const companies = require('../models/companies');

const { getMetadata } = require('../controllers/companies');

const {
    parseFromSourceByTickerAndType,
    crawlByCompany: crawlFilingsByCompany
} = require('../controllers/filings');
const {
    downloadByCompany: downloadFilingDocumentsByCompany,
    crawlByCompany: crawlFilingDocumentsByCompany
} = require('../controllers/filingDocuments');

router.post('/', async (req, res) => {
    const { path } = req.body;
    logs('loading companies from json');
    await loadCompaniesFromJson(path, (newCompanies) => {
        each(newCompanies, (companyObj) => {
            companies.model.create(companyObj);
        });

        const message = `loaded ${Object.keys(newCompanies).length} companies from json`;
        logs(message);
        res.status(200).send({ message });
    });
});

router.get('/:ticker', async (req, res) => {
    const { params = {} } = req;
    const { ticker } = params;

    let company = await companies.model.findOne({ ticker });
    if (company) {
        return res.status(200).send(company);
    }

    let companyMetadata = await getMetadata(ticker);
    if (companyMetadata) {
        company = await companies.model.create(companyMetadata);
        return res.status(200).send(company);
    }

    return res.status(500).send({
        err: `unable to retrieve company with ticker ${ticker}. please try again!`
    });
})

router.get('/crawl/:companyId/filings', async (req, res) => {
    const { companyId } = req.params;
    const {
        source = 'sec',
        // todo: validate filingTypes at some point in the pipeline that
        // is shared by many consumers
        filingType = '10-K'
    } = req.query;

    if (!companyId) {
        return res.status(401).send({ err: 'No filing id provided.' });
    }

    const { ticker } = await companies.model.findById(companyId);

    // fetch all filings for company
    const result = await parseFromSourceByTickerAndType(source, [ticker], filingType);
    const [filings] = Object.keys(result);
    let crawledFilings = [];

    if (filings.length) {
        // todo:

        crawledFilings = await crawlFilingsByCompany(companyId);
        await downloadFilingDocumentsByCompany(companyId);
        await crawlFilingDocumentsByCompany(companyId);
    }
    
    return res.status(200).send(crawledFilings);
});

module.exports = router;