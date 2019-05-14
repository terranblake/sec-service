const bodyParser = require('body-parser');
const express = require('express');
const util = require('util');
const { logs, errors } = require('./src/utils/logging');

require('./src/utils/gcp/kms').decrypt(
    './config/default.json',
    './config/client.json',
    require('./src/utils/postAuth')
);

const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const PORT = process.env.PORT || 3000;

app
    .use('/', async (req, res, next) => {
        logs(`${req.method} ${req.originalUrl}`);
        next();
    })
    .use('/api', require('./src/utils/route').init())
    .use('/api', require('./src/routes'));

app.listen(PORT, logs(`listening on ${PORT}`));

// TODO :: Wrap this as a subscription listener
//          and move to utils
require('./src/utils/gcp/')
    .pubsub.subscribe(
        'ProcessFilings',
        60,
        (message) => {
            logs(`received message ${message.id}:`);
            logs(`\tdata: ${message.data}`);
            logs(`\tattributes: ${util.inspect(message.attributes, { showHidden: true, depth: null })}`);
            logs(`\tpublished: ${message.publishTime}`);

            message.ack();
        },
        errors
    );