const express = require('express')
const router = express.Router({ mergeParams: true });

const on = require('await-on');
const { Filing, Company } = require('@postilion/models');

router.get('/:id', async (req, res) => {
    const { params = {} } = req;
    const { id = '' } = params;

    const [filingError, filingObject] = await on(Filing.findById(id));
    if (filingError) {
        return res.status(400).send({
            error: `unable to find filing with id ${company}`
        });
    }

    if (filingObject) {
        return res.status(200).send(filingObject);
    }

    return res.status(400).send({
        message: `unable to find filing with that id`
    });
});

router.get('/', async (req, res) => {
    const { query = {} } = req;
    const { company = '' } = query;

    const [companyError] = await on(Company.findById(company));
    if (companyError) {
        return res.status(400).send({
            error: `unable find company with id ${company}`
        });
    }

    const filings = await Filing.find({ company }).lean();
    if (filings) {
        return res.status(200).send(filings);
    }

    return res.status(400).send({
        message: 'unable to find filings for that company'
    })
});

module.exports = router;