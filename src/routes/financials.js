const { keys } = require('lodash');

const express = require('express')
const router = express.Router({ mergeParams: true });

const { Filing, Company } = require('@postilion/models');
const { redis } = require('@postilion/stores');

const { getByCompanyAndYear } = require('../controllers/financials');

const { logger, roleByFinancial } = require('@postilion/utils');
const financials = keys(roleByFinancial);

const requestCacheKeyBase = 'postilion:cache:route:financials';

// get all supported financials (available keys)
router.get('/', async (_req, res) => res.json(keys(roleByFinancial)));

// get all roles included in a financial (values)
router.get('/:financial', async (req, res) => {
    const { financial } = req.params;

    if (!financials.includes(financial)) {
        return res.status(500).send({
            err: `unsupported financial`,
            financials
        });
    }

    res.json(roleByFinancial[financial]);
});

// get all values included in a financial for a specific company
// this would use the industry defined financial to parse the
// results into a standardized version of the financial statement
router.get('/:financial/:ticker', async (req, res) => {
    const { financial, ticker } = req.params;
    const { year, quarter } = req.query;

    // fixme: disabling all statement that aren't income statement
    // while i work on refining the strategy for building each statement
    // and the process for selecting values
    // if (!financials.includes(financial)) {
    if (!['income-statement'].includes(financial)) {
        return res.status(500).send({
            err: `unsupported financial`,
            message: financials
        });
    }

    if (!year) {
        return res.status(401).send({ err: 'No year provided. 👎' });
    }

    const company = await Company.findOne({ ticker });
    if (!company) {
        return res.status(401).send({
            err: 'No company found with that ticker. 👎',
            message: `use the following endpoint to pull in a ticker /api/companies/${ticker}`
        });
    }

    // todo: handle filings not for the year requested
    const crawledFilings = await Filing.find({
        company: company._id,
        status: { $in: ['crawled', 'downloaded'] }
    }).count();

    if (!crawledFilings) {
        return res.status(401).send({
            err: 'No crawled or downloaded filings for ticker. 👎',
            message: `use the following endpoint to fetch and crawl all filings for a ticker /api/companies/crawl/filings?ticker=${ticker}`
        });
    }

    const cacheKey = `${requestCacheKeyBase}:${ticker}:${financial}:${year}:${quarter}`;

    let result;
    const cacheHit = await redis.get(cacheKey);
    if (cacheHit) {
        logger.info(`cache hit for key ${cacheKey}`);
        result = JSON.parse(cacheHit);
    } else {
        logger.info(`cache miss for key ${cacheKey}`);
        result = await getByCompanyAndYear(financial, ticker, year, quarter);
        await redis.set(cacheKey, JSON.stringify(result));
    }

    return res.status(200).send(result);
});

// todo: endpoints
/*

*/

module.exports = router;