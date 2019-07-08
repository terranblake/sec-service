const {
    filings,
    contexts,
    facts,
    taxonomyExtensions,
    companies
} = require('../models');

var express = require('express')
var router = express.Router({ mergeParams: true });

router
    // Use this route for querying the tree, once built
    .post('/destroy', async (req, res) => {
        res.status(200).send({
            filings: await filings.model.deleteMany({}),
            contexts: await contexts.model.deleteMany({}),
            facts: await facts.model.deleteMany({}),
            taxonomyExtensions: await taxonomyExtensions.model.deleteMany({}),
            companies: await companies.model.deleteMany({}),
        });
    })

module.exports = router;