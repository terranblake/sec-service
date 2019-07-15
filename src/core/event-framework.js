const Connection = require('./connection');
const supportedImplementations = require('./implementations/supported');
const eventFunnel = require('./event-funnel');

class EventFramework {
	get listeners() {
		return this.__listeners;
	}

	set listeners(value) {
		this.__listeners = value;
	}

	constructor(options) {
		this.__options = options;
		this.__listeners = {};
	}

	initialize() {
		console.log('initializing event framework');
		for (let implementationName of this.__options) {
			if (!supportedImplementations(implementationName)) {
				throw new Error(`${implementationName} is not a supported connection`);
			}

			console.log(`subscribing to events from ${implementationName}`);

			let listener = new Connection(implementationName);
			listener.subscribe(eventFunnel, (err, res) => {
				console.log(`subscribed to events from ${implementationName}`);
				this.__listeners[implementationName] = listener;
			});
		}
	}
}

module.exports = EventFramework;