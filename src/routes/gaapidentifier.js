const { gaapIdentifier } = require('../models');
const { seedTree } = require('../controllers/gaapidentifiers');
const { logs } = require('../utils/logging');

var express = require('express')
var router = express.Router({ mergeParams: true });

router
    // Use this route for querying the tree, once built
    .get('/pick', async (req, res) => {
        const identifier = await gaapIdentifier.findByDepth(0);
        if (Array.isArray(identifier) && identifier.length) {
            res.status(200).send(identifier[0]);
        }

        res.status(400).send('tree has not been grown... please seed and hydrate before picking.');
    })
    .post('/seed', async (req, res) => {
        const { path, type } = req.body;

        logs(`seeding ${type} from json`);
        const seeds = await seedTree(path, type);

        res.status(200).send(seeds);
    })

module.exports = router;