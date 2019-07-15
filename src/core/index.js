const { readdirSync } = require('fs');

module.exports = () => {
	const models = {};
	for (let route of readdirSync('./src/core').filter(f => f.includes('.js') && f !== __filename)) {
		models[route.split('.')[0]] = require(`./${route}`);
	}
	
	return models;
}