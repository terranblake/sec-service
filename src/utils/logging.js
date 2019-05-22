const colors = require('colors');
colors.setTheme({
    // info (green, cyan, blue)
    infoPrimary: 'green',
    infoItem: 'cyan',

    // error (red, yellow, magenta)
    warnPrimary: 'orange',
    warnItem: 'yellow',

    // error (red, yellow, magenta)
    errorPrimary: 'red',
    errorItem: 'magenta',
});

const error = console.error.bind(console);
const warn = console.warn.bind(console);
const log = console.log.bind(console);

module.exports.logs = function logs(obj) {
    // TODO :: pass object to persistent logging tool
    // log({ caller: logs.caller, obj });

    switch (obj.name) {
        default:
            log(
                (new Date()).toString(),
                `[server]`.infoPrimary,
                typeof obj === 'object' ?
                    (`${obj.name}`.infoItem || '', `${obj.message}`.infoPrimary || '') :
                    `${obj}`.infoItem
            );
    }
}

module.exports.warns = function warns(obj) {
    // TODO :: pass object to persistent logging tool
    // log({ caller: logs.caller, obj });

    switch (obj.name) {
        default:
            warn(
                (new Date()).toString(),
                `[server]`.infoPrimary,
                typeof obj === 'object' ?
                    (`${obj.name}`.warnItem || '', `${obj.message}`.warnPrimary || '') :
                    `${obj}`.warnItem
            );
    }
}

module.exports.errors = function errors(obj) {
    switch (obj.name) {
        case 'TypeError':
        case 'MongoError':
        case 'ValidationError':
            error(
                (new Date()).toString(),
                `[server]`.errorPrimary,
                `${obj.name}`.errorItem,
                `${obj.message}`.errorPrimary
            );
            break;
        default:
            error(
                (new Date()).toString(),
                `[server]`.errorPrimary,
                typeof obj === 'object' ?
                    (`${obj.name}`.errorItem || '', `${obj.message}`.errorPrimary || '') :
                    `${obj}`.errorItem
            );
    }
}