const { fetchLatestFilings } = require('../controllers/filings');
const noneFound = { message: 'No filing could be found!' };

var express = require('express')
var router = express.Router({ mergeParams: true });

router
    .post('/populate', async (req, res) => {
        const { fetchSource } = req.body;
        if (!fetchSource) {
            return res.status(401).send({ err: 'No fetchSource provided.' });
        }

        const result = await fetchLatestFilings(fetchSource);
        return res.status(200).send(result || noneFound);
    });

module.exports = router;