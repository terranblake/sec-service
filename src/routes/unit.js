const { upsertExisting } = require('../controllers/units');
const { logs } = require('../utils/logging');

var express = require('express')
var router = express.Router({ mergeParams: true });

router
    .get('/update', async (req, res) => {
        const units = await upsertExisting();

        res.status(200).send({ units });
    })

module.exports = router;