const { parseFiling } = require('../controllers/filings');
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
    })
    .post('/parse', async (req, res) => {
        let { id } = req.body;
        if (!id) {
            return res.status(401).send({ err: 'No id provided.' });
        }

        const result = await parseFiling(id);
        return res.status(200).send(result || noneFound);
    });

module.exports = router;