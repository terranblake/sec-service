const { logs } = require('../logging');
const { PubSub } = require('@google-cloud/pubsub');

module.exports.publish = async function publish(topicName, data) {
    // Creates a client
    const pubsub = new PubSub();

    // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
    const dataBuffer = Buffer.from(data.toString());

    const messageId = await pubsub.topic(topicName).publish(dataBuffer);
    logs(`message ${messageId} published to topic ${topicName}`);
}

module.exports.subscribe = function subscribe(subscriptionName, timeout, handler, next) {
    // Creates a client
    const pubsub = new PubSub();

    // References an existing subscription
    const subscription = pubsub.subscription(subscriptionName);
    subscription.on(`message`, handler);
}