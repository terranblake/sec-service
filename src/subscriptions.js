// every service should define a single file that exports Array<Subscription>
// which defines how it interacts with each queue and any filters or options

const models = require('@postilion/models');
const { Operation } = require('@postilion/event-framework');
const { logger } = require('@postilion/utils');

module.exports = [
    {
        name: 'IdentifierCreation',
        model: models.Identifier,
        operation: Operation.create,
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
];