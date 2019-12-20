const { crawlTaxonomyXlsxSheet } = require('../controllers/identifiers');

const express = require('express');
const router = express.Router({ mergeParams: true });

router.post('/crawl/:type', async (req, res) => {
    // todo: add support for crawling other types of taxonomy
    // files; ones that are more sustainable for integration
    const { type } = req.params;
    const { path, sheet, version } = req.body;

    // todo: use type param from request to pick the correct crawler type
    await crawlTaxonomyXlsxSheet(path, sheet, version);
    res.status(200).send({ result: `👍` });
})

module.exports = router;