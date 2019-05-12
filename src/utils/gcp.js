const { PubSub } = require('@google-cloud/pubsub');
const credsPath = 'google-cloud';

const config = require('config');
const { logs, errors } = require('./logging');

async (creds =
    config.has(credsPath) &&
    config.get(credsPath)
) => {
    if (!creds || )
}