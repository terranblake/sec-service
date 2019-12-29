const { PubSub } = require('@postilion/pubsub');
const subscriptions = require('./subscriptions');

const pubsub = new PubSub(subscriptions);
module.exports = pubsub;