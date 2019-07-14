let router = require('express').Router({ mergeParams: true });
const { readdirSync } = require('fs');
const fileName = __filename.split('/').pop();

for (let route of readdirSync('./src/routes/').filter(f => f.includes('.js') && f !== fileName)) {
	router.use(`/${route.split('.')[0]}`, require(`./${route}`));
}

module.exports = router;