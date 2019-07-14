const { readdirSync } = require('fs');
const fileName = __filename;

module.exports = (() => {
	const models = {};
	for (let route of readdirSync('./src/controllers/').filter(f => f.includes('.js') && f !== fileName)) {
		models[route.split('.')[0]] = require(`./${route}`);
	}
	
	return models;
})