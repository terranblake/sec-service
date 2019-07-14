const { parseFromSourceByTickerAndType } = require('../controllers/filings');
const noneFound = { message: 'No filing could be found!' };
var express = require('express')
var router = express.Router({ mergeParams: true });

router
    .post('/fetch', async (req, res) => {
        const { source, tickers, type } = req.body;
        
        if (!source) {
            return res.status(401).send({ err: 'No source provided.' });
        }

        const result = await parseFromSourceByTickerAndType(source, tickers, type);
        return res.status(200).send(result || noneFound);
    })

module.exports = router;