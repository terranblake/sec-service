const express = require('express');
const router = express.Router({ mergeParams: true });
const on = require('await-on');

const { Taxonomy } = require('@postilion/models');

router.post('/', async ({ body }, res) => {
    const [creationError] = await on(Taxonomy.create(body));
    if (creationError) {
        return res.status(400).send(creationError);
    }

    res.status(200).send({
        message: 'successfully created taxonomy'
    });
})

module.exports = router;