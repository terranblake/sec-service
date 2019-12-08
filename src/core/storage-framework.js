const Connection = require('./connection');
const supportedImplementations = require('./implementations/supported');
const { logs, errors } = require('../utils/logging');

class StorageFramework {
	get connections() {
		return this.__connections;
	}

	set connections(value) {
		this.__connections = value;
	}

	constructor (options) {
		this.__options = options;
		this.__connections = {};
	}

	initialize() {
		console.log('initializing storage framework');
		for (let implementationName of this.__options) {
			if (!supportedImplementations(implementationName)) {
				console.error(`${implementationName} is not a supported storage implementation`);
			}

			let connection = new Connection(implementationName);
			connection.connect((err, res) => {
				if (err) {
					return errors({ message: `${implementationName} ${err.message}`, metadata: { implementationName } });
				}
				logs({ message: `${implementationName} connection established`, metadata: { implementationName } });
				this.__connections[implementationName] = connection;
			});
		}

		
	}
}

module.exports = StorageFramework;