const supportedImplementations = require('./implementations/supported');

class Connection {
    get ref() {
        return this.__implementationRef;
    }

    set ref(value) {
        this.__implementationRef = value;
    }

    constructor(implementation, listeners) {
        implementation = supportedImplementations(implementation);
        this.__implementationRef = new implementation();
        this.__listeners = listeners;
    }

    connect(callback) {
        this.__implementationRef.connect(callback);
    }

    async subscribe(listener, callback) {
        await this.__implementationRef.subscribe(listener, callback);
    }

    async status() {
        return this.__implementation.status();
    }
}

module.exports = Connection;