const {
    parseFilingRssFeed,
    crawlById
} = require('../controllers/filings');

const noneFound = { message: 'No filing could be found!' };
var express = require('express')
var router = express.Router({ mergeParams: true });

router.post('/fetch', async (req, res) => {
    const { source, tickers, type } = req.body;

    if (!source) {
        return res.status(401).send({ err: 'No source provided.' });
    }

    const result = await parseFilingRssFeed(source, tickers, type);
    return res.status(200).send(result || noneFound);
});

router.get('/crawl/:filingId', async (req, res) => {
    const { filingId } = req.params;

    if (!filingId) {
        return res.status(401).send({ err: 'No filing id provided.' });
    }

    const result = await crawlById(filingId, req.query);
    return res.status(200).send(result);
});

module.exports = router;