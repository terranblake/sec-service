const {
    downloadByCompany,
    crawlByFiling
} = require('../controllers/filingDocuments');

var express = require('express')
var router = express.Router({ mergeParams: true });

router.get('/download/:company', async (req, res) => {
    const { company } = req.params;

    if (!company) {
        return res.status(401).send({ err: 'No company id provided.' });
    }

    const result = await downloadByCompany(company);
    return res.status(200).send(result);
});

router.get('/crawl/:filingId', async (req, res) => {
    const { filingId } = req.params;

    if (!filingId) {
        return res.status(401).send({ err: 'No filing id provided.' });
    }

    const result = await crawlByFiling(filingId);
    return res.status(200).send(result);
});

module.exports = router;