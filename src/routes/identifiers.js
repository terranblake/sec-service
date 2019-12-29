const express = require('express');
const router = express.Router({ mergeParams: true });

router.post('/', async (req, res) => {
    // verify that this taxonomy hasn't been created before, then
    // create a new one, which will fire off a job to be consumed
    // by taxonomy-service to build the tree based on the type
    // and which file types are available for that taxonomy
})

module.exports = router;