const { filing: { methods } } = require('../models/index.js');
const logs = console.log.bind({ console });
const errors = console.error.bind({ console });

const noneFound = { message: 'No filing could be found!' };

var express = require('express')
var router = express.Router({ mergeParams: true });

router.route('/')
    .post(async (req, res) => {
        const newItem = await methods.create(req.body);

        res.status(200).send({
            message: 'New filing created',
            _id: newItem._id,
        });
    });

router.route('/latest')
    .get(async (req, res) => {
        const result = await methods.findMostRecentlyPublished();
        logs({ result });

        res.status(200).send(result || noneFound);
    });

router.route('/all')
    .get(async (req, res) => {
        const result = await methods.findAll();
        logs({ result });

        res.status(200).send(result || noneFound);
    })
    .delete(async (req, res) => {
        const result = await methods.deleteAll();
        logs({ result });

        res.status(200).send(result || noneFound);
    });

router.route('/:id')
    .get(async (req, res) => {
        const result = await methods.findById(req.params.id);
        logs({ result });

        res.status(200).send(result || noneFound);
    });

module.exports = router;