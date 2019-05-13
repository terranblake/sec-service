const bodyParser = require('body-parser');
const express = require('express');
const { logs } = require('./src/utils/logging');

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