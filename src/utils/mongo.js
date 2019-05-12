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
        logs(connection);

        // return `mongodb://${server}/${database}`
        return false;
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
            .connect(this.__connection)
            .then(() => logs('mongodb connection established'))
            .catch((err) => errors(err));
    }
}

module.exports = new Database(connection());