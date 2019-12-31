const express = require('express')
const router = express.Router({ mergeParams: true });

const on = require('await-on');

const { metadata } = require('@postilion/utils');
const { Company } = require('@postilion/models');

router.get('/:id', async (req, res) => {
    const { params = {} } = req;
    const { company = '' } = params;

    const [companyError, companyObject] = await on(Company.findById(company));
    if (companyError) {
        return res.status(400).send({
            error: `unable to find company with id ${company}`
        });
    }

    if (companyObject) {
        return res.status(200).send(companyObject);
    }

    return res.status(400).send({
        message: `unable to find company with that id`
    });
});

// todo: add query parser to base routes for more complex queries
router.get('/', async (req, res) => {
    const { query = {} } = req;
    const { ticker } = query;

    let company = await Company.findOne({ ticker });
    if (company) {
        return res.status(200).send(company);
    }

    let [metadataError, companyMetadata] = await on(metadata(Company, ticker));
    if (metadataError) {
        return res.status(400).send({
            message: 'metadata-service is unreachable. please try again later',
            ...metadataError
        });
    }

    if (companyMetadata) {
        company = await Company.create(companyMetadata);
        return res.status(200).send(company);
    }

    return res.status(500).send({
        err: `unable to retrieve company with ticker ${ticker}. please try again!`
    });
});

module.exports = router;