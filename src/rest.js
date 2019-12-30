const bodyParser = require('body-parser');
const express = require('express');

const { logger } = require('@postilion/utils');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.use('/', async (req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
})
app.use('/api', require('./routes'));

app.listen(PORT, logger.info(`listening on port ${PORT}`));