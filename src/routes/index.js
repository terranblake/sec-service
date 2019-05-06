const router = require('express').Router({ mergeParams: true });

router.use('/filing', require('./filing'));
router.use('/company', require('./company'));
router.use('/gaap', require('./gaap-identifier'));

module.exports = router;