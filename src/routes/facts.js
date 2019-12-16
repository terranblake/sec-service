const express = require('express')
const router = express.Router({ mergeParams: true });

const {
    parseFromFiling,
    getChildren
} = require('../controllers/facts');

router.post('/fetch', async (req, res) => {
    const { filingId } = req.body;

    if (!filingId) {
        return res.status(401).send({ err: 'No filing id provided.' });
    }

    const result = await parseFromFiling(filingId);
    return res.status(200).send(result);
});

router.get('/children', async (req, res) => {
    const { filing, identifierName, roleName } = req.query;

    if (!filing) {
        return res.status(401).send({ err: 'No filing id provided.' });
    }

    const result = await getChildren(filing, identifierName, roleName);
    return res.status(200).send(result);
});

module.exports = router;