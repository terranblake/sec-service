// todo: just do this so we don't forget to use this env variable
process.env.ARCHIVE_LOCATION = process.env.ARCHIVE_LOCATION || '/Users/terran/Desktop/sec-filing-archive';

const bodyParser = require('body-parser');
const express = require('express');

const { logger } = require('@postilion/utils');
const models = require('@postilion/models');
const { EventFramework } = require('@postilion/event-framework');

const subscriptions = [
    {
        name: 'IdentifierCreation',
        model: models.Identifier,
        // define set of operations that can be used
        operation: 'change',
        handler: logger.info,
        filters: [
            // todo: add support for more filter types
            // supports pipeline out of the box
            // need basic mongo query syntax filtering
        ],
        options: {
            // defines options to be passed to the resulting
            // change stream. mongodb documentation provides
            // details: http://mongodb.github.io/node-mongodb-native/3.3/api/Collection.html#watch
            // fullDocument: 'default',
        }
    }
]

const eventFramework = new EventFramework('mongodb://localhost:27017/fundamentals?replicaSet=rs', subscriptions);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.use('/', async (req, res, next) => {
    logs(`${req.method} ${req.originalUrl}`);
    next();
})
app.use('/api', require('./src/routes'));

app.listen(PORT, logger.info(`listening on port ${PORT}`));