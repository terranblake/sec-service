const router = require('express').Router({ mergeParams: true });

router.use('/filings', require('./filing'));
router.use('/companies', require('./company'));
router.use('/gaapidentifiers', require('./gaapidentifier'));
router.use('/units', require('./unit'));

module.exports = router;