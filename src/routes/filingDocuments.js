const { parseFilingDocumentsFromFiling } = require('../controllers/filingDocuments');
var express = require('express')
var router = express.Router({ mergeParams: true });

router.post('/fetch', async (req, res) => {
    const { filingId } = req.body;

    if (!filingId) {
        return res.status(401).send({ err: 'No filing id provided.' });
    }

    const result = await parseFilingDocumentsFromFiling(filingId);
    return res.status(200).send(result);
})

module.exports = router;