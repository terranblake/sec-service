const { companies } = require('../models');
const { loadCompaniesFromJson } = require('../utils/raw-data-helpers');

const { each } = require('lodash');

const logs = console.log.bind({ console });
const errors = console.error.bind({ console });
const ObjectId = i => i;

var express = require('express')
var router = express.Router({ mergeParams: true });

router
    .post('/', async (req, res) => {
        const { path } = req.body;
        logs({ message: 'loading companies from json' });
        await loadCompaniesFromJson(path, (newCompanies) => {
            each(newCompanies, (companyObj) => {
                companies.create(companyObj);
            });

            const message = `loaded ${Object.keys(newCompanies).length} companies from json`;
            res.status(200).send({ message });
        });
    })

module.exports = router;