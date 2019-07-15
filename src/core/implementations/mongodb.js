const mongoose = require('mongoose');
const config = require('config');
const fileName = __filename.split('/').pop().split('.')[0];

const connectionEvents = {
    connecting: "Emitted when Mongoose starts making its initial connection to the MongoDB server",
    connected: "Emitted when Mongoose successfully makes its initial connection to the MongoDB server",
    open: "Equivalent to connected",
    disconnecting: "Your app called Connection#close() to disconnect from MongoDB",
    disconnected: "Emitted when Mongoose lost connection to the MongoDB server. This event may be due to your code explicitly closing the connection, the database server crashing, or network connectivity issues.",
    close: "Emitted after Connection#close() successfully closes the connection. If you call conn.close(), you'll get both a 'disconnected' event and a 'close' event.",
    reconnected: "Emitted if Mongoose lost connectivity to MongoDB and successfully reconnected. Mongoose attempts to automatically reconnect when it loses connection to the database.",
    error: "Emitted if an error occurs on a connection, like a parseError due to malformed data or a payload larger than 16MB.",
    fullsetup: "Emitted when you're connecting to a replica set and Mongoose has successfully connected to the primary and at least one secondary.",
    all: "Emitted when you're connecting to a replica set and Mongoose has successfully connected to all servers specified in your connection string.",
    reconnectFailed: "Emitted when you're connected to a standalone server and Mongoose has run out of reconnectTries. The MongoDB driver will no longer attempt to reconnect after this event is emitted. This event will never be emitted if you're connected to a replica set.",
};

class MongoDB {
    constructor() {
    }

    connect(callback) {
        const url = MongoDB.buildUrl(config.get(`${fileName}.connection`));

        mongoose.connect(url, { useNewUrlParser: true }, (err) => {
            const db = mongoose.connection;
            this.__db = db;

            callback(err, db);
        });
    }

    async subscribe(eventHandler, callback) {
        const { collections } = mongoose.connection;
        const listeners = [];

        for (let name in collections) {
            const collection = collections[name];
            let changeStream = await collection.watch();
            changeStream.on('change', (data) => {
                console.log(`mongodb documentChange event emitted`);
                eventHandler('mongodb', 'documentChange', data)
            });

            listeners.push(changeStream);
        }

        callback(null, listeners);
    }

    status() {
        return this.__db.readyState();
    }

    static buildUrl({ address, port, database, options }) {
        const query = options && require('querystring').stringify(options);
        return `mongodb://${address}:${port}/${database}${query && `?${query}` || ''}`;
    }
}

module.exports = MongoDB;