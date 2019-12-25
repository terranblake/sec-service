const express = require('express')
const router = express.Router({ mergeParams: true });

const { metadata } = require('@postilion/utils');
const { Company } = require('@postilion/models');

const { downloadByCompany: downloadFilingsByCompany } = require('../controllers/filings');

const {
    downloadByCompany: downloadFilingDocumentsByCompany,
    crawlByCompany: crawlFilingDocumentsByCompany
} = require('../controllers/filing-documents');

router.get('/', async (req, res) => {
    const { query = {} } = req;
    const { ticker } = query;

    let company = await Company.findOne({ ticker });
    if (company) {
        return res.status(200).send(company);
    }

    let companyMetadata = await metadata(Company, ticker);
    if (companyMetadata) {
        company = await Company.create(companyMetadata);
        return res.status(200).send(company);
    }

    return res.status(500).send({
        err: `unable to retrieve company with ticker ${ticker}. please try again!`
    });
});

// todo: deprecate this route in favor of a service-based
// solution which listens for a scheduled job to crawl a
// source for new filings (scheduled integration with sec)
router.get('/crawl/filings', async (req, res) => {
    // const { source, ticker } = req.query;

    // if (!ticker) {
    //     return res.status(401).send({ err: 'No ticker provided.' });
    // }

    // const { _id: companyId } = await Company.findOne({ ticker });

    // // fetch all filings for company
    // const feedEntries = await getLatestFilingFeed(ticker, source);

    // // create filing from each entry
    // for (let entry of feedEntries) {
    //     await Filing.create(entry);
    // }

    // await downloadFilingsByCompany(companyId);
    // await downloadFilingDocumentsByCompany(companyId);
    await crawlFilingDocumentsByCompany(companyId);

    return res.status(200).send(crawledFilings);
});

module.exports = router;