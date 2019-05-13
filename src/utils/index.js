const { logs, errors } = require('./logging');

module.exports.loaded = (moduleName) => {
    try {
        require.resolve(moduleName);
        logs(`[${moduleName}] module is loaded`)
        return true;
    } catch(e) {
        errors(`[${moduleName}] is not loaded ${e}`);
        return false;
    }
}