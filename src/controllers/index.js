const { readdir } = require('fs');

module.exports = () => {
	const models = {};
	for (let route of readdir('./')) {
		models[route] = require(`./${route}`);
	}
	
	return models;
}