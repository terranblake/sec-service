const { each } = require('lodash');

var express = require('express')
var router = express.Router({ mergeParams: true });

// todo: move into another service or create module for specific
// types of raw data helpers
const { loadCompaniesFromJson } = require('../utils/raw-data-helpers');

const { logger } = require('@postilion/utils');
const { Filing, Company } = require('@postilion/models');

const {
    parseFilingRssFeed,
    downloadByCompany: downloadFilingsByCompany
} = require('../controllers/filings');

const {
    downloadByCompany: downloadFilingDocumentsByCompany,
    crawlByCompany: crawlFilingDocumentsByCompany
} = require('../controllers/filing-documents');

const { getMetadata } = require('../controllers/companies');

router.post('/', async (req, res) => {
    const { path } = req.body;
    logger.info('loading companies from json');
    await loadCompaniesFromJson(path, (newCompanies) => {
        each(newCompanies, (companyObj) => {
            Company.create(companyObj);
        });

        const message = `loaded ${Object.keys(newCompanies).length} companies from json`;
        logger.info(message);
        res.status(200).send({ message });
    });
});

router.get('/', async (req, res) => {
    const { query = {} } = req;
    const { ticker } = query;

    let company = await Company.findOne({ ticker });
    if (company) {
        return res.status(200).send(company);
    }

    let companyMetadata = await getMetadata(ticker);
    if (companyMetadata) {
        company = await Company.create(companyMetadata);
        return res.status(200).send(company);
    }

    return res.status(500).send({
        err: `unable to retrieve company with ticker ${ticker}. please try again!`
    });
})

router.get('/crawl/filings', async (req, res) => {
    const {
        source = 'sec',
        // todo: validate filingTypes at some point in the pipeline that
        // is shared by many consumers
        filingType = '10-K',
        ticker
    } = req.query;

    if (!ticker) {
        return res.status(401).send({ err: 'No ticker provided.' });
    }

    const { _id: companyId } = await Company.findOne({ ticker });

    // fetch all filings for company
    await parseFilingRssFeed(source, [ticker], filingType);

    await downloadFilingsByCompany(companyId);
    await downloadFilingDocumentsByCompany(companyId);
    await crawlFilingDocumentsByCompany(companyId);
    
    const crawledFilings = await Filing.find({ status: 'crawled' });
    return res.status(200).send(crawledFilings);
});

module.exports = router;