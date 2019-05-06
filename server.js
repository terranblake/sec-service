const bodyParser = require('body-parser');
const express = require('express');
const logs = console.log.bind(console);

const colors = require('colors');
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
  });

require('./src/utils/mongo');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const PORT = process.env.PORT || 3000;

var router = express.Router();

app
    .use('/', (req, res, next) => {
        logs(`[server] ${req.method} ${req.originalUrl}`.info);
        next();
    })
    .use('/api', require('./src/routes'));

app.listen(PORT, logs(`[server] listening on ${PORT}`.debug));