// todo: just do this so we don't forget to use this env variable
process.env.ARCHIVE_LOCATION = process.env.ARCHIVE_LOCATION || '/Users/terran/Desktop/sec-filing-archive';

const bodyParser = require('body-parser');
const express = require('express');
const { logs } = require('./src/utils/logging');

const StorageFramework = require('./src/core/storage-framework');
let storageFramework;

function storage() {
    storageFramework = new StorageFramework(['mongodb']);
    storageFramework.initialize();
}

storage();

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