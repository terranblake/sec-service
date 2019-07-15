const bodyParser = require('body-parser');
const express = require('express');
const { logs } = require('./src/utils/logging');
const mongoose = require('mongoose');

const StorageFramework = require('./src/core/storage-framework');
const EventFramework = require('./src/core/event-framework');
let storageFramework, eventFramework;

function storage() {
    storageFramework = new StorageFramework(['mongodb']);
    storageFramework.initialize();
}

function events() {
    eventFramework = new EventFramework(['mongodb']);
    eventFramework.initialize();
}

storage();
mongoose.connection
    .on('connected', events)
    // .on('resetting', events)
    // .on('reconnectionFailed', storage);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app
    .use('/', async (req, res, next) => {
        logs(`${req.method} ${req.originalUrl}`);
        next();
    })
    .use('/api', require('./src/routes'));

app.listen(PORT, logs(`listening on port ${PORT}`));