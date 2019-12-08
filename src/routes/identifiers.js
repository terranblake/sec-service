const identifiers = require('../models/identifiers');
const { seedTree } = require('../controllers/identifiers');
const { logs } = require('../utils/logging');
const {
    getFilingsIdentifierCoverage,
    getCoverageByIdentifier,
    getCoverageByCompanyAndIdentifier
} = require('../utils/identifier-coverage');

const express = require('express');
const router = express.Router({ mergeParams: true });

router
    // Use this route for querying the tree, once built
    .get('/pick', async (req, res) => {
        const identifier = await identifiers.findByDepth(0);
        if (Array.isArray(identifier) && identifier.length) {
            res.status(200).send(identifier[0]);
        }

        res.status(400).send('tree has not been grown... please seed and hydrate before picking.');
    })
    .get('/coverage', async (req, res) => {
        const result = await getHandler({ ...req.body, ...req.query });
        return res.status(200).send(result);
    })
    .post('/seed', async (req, res) => {
        const { path, type } = req.body;

        logs(`seeding ${type} from json`);
        const seeds = await seedTree(path, type);

        res.status(200).send(seeds);
    })

async function getHandler(params) {
    if (params.identifiers) {
        if (params.aggregate) {
            return await getCoverageByCompanyAndIdentifier(params);
        } else {
            return await getCoverageByIdentifier(params);
        }
    } else {
        return await getFilingsIdentifierCoverage(params);
    }
}

module.exports = router;