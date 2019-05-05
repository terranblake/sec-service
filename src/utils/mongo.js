let mongoose = require('mongoose');
const logs = console.log.bind(console);
const errors = console.log.bind(console);

const server = '127.0.0.1:27017';
const database = 'fundamentals';

class Database {
    constructor() {
        this.__connect();
    }

    __connect() {
        mongoose
            .connect(`mongodb://${server}/${database}`)
            .then(() => logs('[server] mongodb connection established'))
            .catch((err) => errors(err));
    }
}

module.exports = new Database();