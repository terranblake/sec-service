const logs = console.log.bind(console);

module.exports.errorHandler = function errorHandler(err) {
    logs({ this: this, err });

    switch (err.name) {
        case 'TypeError':
        case 'MongoError':
        case 'ValidationError':
            errors(`[server]`.error, err.name, err.message);
            break;
        default:
            errors(`[server]`.error, err.name, err.message);
    }
  }