let mongoose = require('mongoose');
const config = require('config');

const { logs, errors } = require('./logging');
const { loaded } = require('./index');

const connection = () => {
    if (loaded('config')) {
        if (!config.has('mongodb.connection')) {
            return false;
        }

        const connection = config.get('mongodb.connection');
        const { address, port, database } = connection;
        return `mongodb://${address}:${port}/${database}`
    }

    return false;
}

class Database {
    constructor(connection) {
        if (connection) {
            this.__connection = connection;
            this.__connect();
        } else {
            errors('mongodb connection error');
        }
    }

    __connect() {
        mongoose
            .connect(this.__connection, { useNewUrlParser: true })
            .then(() => logs(`mongodb connection established ${this.__connection}`))
            .catch((err) => errors(err));
    }
}

module.exports = new Database(connection());