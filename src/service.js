const { EventFramework } = require('@postilion/event-framework');
const subscriptions = require('./subscriptions');

// todo: replace with config values
const connectionString = 'mongodb://localhost/postilion';

const events = new EventFramework(connectionString, subscriptions);
module.exports = events;