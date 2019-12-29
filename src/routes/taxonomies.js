const express = require('express');
const router = express.Router({ mergeParams: true });
const on = require('await-on');

const { Taxonomy } = require('@postilion/models');

router.post('/', async ({ body }, res) => {
    // verify that this taxonomy hasn't been created before, then
    // create a new one, which will fire off a job to be consumed
    // by taxonomy-service to build the tree based on the type
    // and which file types are available for that taxonomy

    const [creationError] = await on(Taxonomy.create(body));
    if (creationError) {
        return res.status(400).send(creationError);
    }

    res.status(200).send({
        message: 'successfully created taxonomy'
    });
})

module.exports = router;