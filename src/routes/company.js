const { company: { methods } } = require('../models');
const { loadCompaniesFromJson } = require('../utils/raw-data-helpers');

const { each } = require('lodash');

const logs = console.log.bind({ console });
const errors = console.error.bind({ console });
const ObjectId = i => i;

var express = require('express')
var router = express.Router({ mergeParams: true });

router
    .get('/:cik', async(req, res) => {
        const { cik } = req.params;
        const company = await methods.findByCik(cik);

        res.status(200).send({ company });
    })
    .post('/', async (req, res) => {
        const { path } = req.body;
        logs({ message: 'loading companies from json' });
        await loadCompaniesFromJson(path, (companies) => {
            each(companies, (company) => {
                methods.create(company);
            });

            const message = `loaded ${Object.keys(companies).length} companies from json`;
            logs({ message });
        });

        res.status(200).send('OK');
    })

module.exports = router;