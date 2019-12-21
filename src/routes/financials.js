const express = require('express')
const router = express.Router({ mergeParams: true });

const filings = require('../models/filings');
const companies = require('../models/companies');
const { getByCompanyAndYear } = require('../controllers/financials');

const roleByFinancialStatement = require('../utils/role-by-financial-statement');
const financials = Object.keys(roleByFinancialStatement);

// get all supported financials (available keys)
router.get('/', async (_req, res) => res.json(Object.keys(roleByFinancialStatement)))

// get all roles included in a financial (values)
router.get('/:financial', async (req, res) => {
    const { financial } = req.params;

    if (!financials.includes(financial)) {
        return res.status(500).send({
            err: `unsupported financial`,
            financials
        });
    }

    res.json(roleByFinancialStatement[financial]);
})

// get all values included in a financial for a specific company
// this would use the industry defined financial to parse the
// results into a standardized version of the financial statement
router.get('/:financial/:ticker', async (req, res) => {
    const { financial, ticker } = req.params;
    const { year } = req.query;

    if (!financials.includes(financial)) {
        return res.status(500).send({
            err: `unsupported financial`,
            message: financials
        });
    }

    if (!year) {
        return res.status(401).send({ err: 'No year provided. 👎' });
    }

    const company = await companies.model.findOne({ ticker });
    if (!company) {
        return res.status(401).send({
            err: 'No company found with that ticker. 👎',
            message: `use the following endpoint to pull in a ticker /api/companies/${ticker}`
        });
    }

    // todo: handle filings not for the year requested
    const crawledFilings = await filings.model.find({ company: company._id, status: { $in: ['crawled', 'downloaded'] } }).count();
    if (!crawledFilings) {
        return res.status(401).send({
            err: 'No crawled or downloaded filings for ticker. 👎',
            message: `use the following endpoint to fetch and crawl all filings for a ticker /api/companies/crawl/filings?ticker=${ticker}`
        });
    }

    const result = await getByCompanyAndYear(financial, ticker, year);
    return res.status(200).send(result);
});

// todo: endpoints
/*

*/

module.exports = router;