const { readdirSync } = require('fs');

const Crud = require('./crud');
let crudMethods = Object
	.getOwnPropertyNames(Crud.prototype)
	.filter(p => !['constructor'].includes(p))
	.reduce((acc, curr) => {
		acc[curr] = Crud.prototype[curr];
		return acc;
	}, {});

let collections = {}

module.exports = async () => {
	for (let route of readdirSync('./src/models/').filter(f => f.includes('.js') && f !== __filename)) {
		const modelName = route.split('.')[0];
		if (collections[modelName]) {
			continue;
		}

		const collection = require(`./${route}`);
		if (collection.model) {
			for (let func in crudMethods) {
				collection[func] = async function () {
					return crudMethods[func](collection.model, ...arguments)
				};
			}
		}
		
		collections[modelName] = collection;
	}

	return collections;
}