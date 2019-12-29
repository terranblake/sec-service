const express = require('express')
const router = express.Router({ mergeParams: true });

const on = require('await-on');

const { metadata } = require('@postilion/utils');
const { Company } = require('@postilion/models');

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