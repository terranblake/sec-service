const { parseOne, fetch } = require('../controllers/filings');
const noneFound = { message: 'No filing could be found!' };
var express = require('express')
var router = express.Router({ mergeParams: true });

router
    .post('/fetch', async (req, res) => {
        const { source, tickers, type } = req.body;
        if (!source) {
            return res.status(401).send({ err: 'No source provided.' });
        }

        !tickers && console.info(`no tickers provided. attempting to fetch from summary rss feed for ${source}`);

        const result = await fetch(source, tickers, type);
        return res.status(200).send(result || noneFound);
    })
    .post('/parse', async (req, res) => {
        let { id } = req.body;
        if (!id) {
            return res.status(401).send({ err: 'No id provided.' });
        }

        const result = await parseOne(id);
        return res.status(200).send(result || noneFound);
    });

module.exports = router;