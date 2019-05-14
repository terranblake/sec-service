const { logs } = require('../logging');

module.exports = {
    kms: require('./kms'),
    pubsub: require('./pubsub')
};

module.exports.topicResolver = function () {
    logs(this.topicResolver.caller.name);
}