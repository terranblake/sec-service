const { companies } = require('../models');
const { loadCompaniesFromJson } = require('../utils/raw-data-helpers');
const { logs } = require('../utils/logging');

const { each } = require('lodash');

var express = require('express')
var router = express.Router({ mergeParams: true });

router
    .post('/', async (req, res) => {
        const { path } = req.body;
        logs('loading companies from json');
        await loadCompaniesFromJson(path, (newCompanies) => {
            each(newCompanies, (companyObj) => {
                companies.create(companyObj);
            });

            const message = `loaded ${Object.keys(newCompanies).length} companies from json`;
            logs(message);
            res.status(200).send({ message });
        });
    })

module.exports = router;