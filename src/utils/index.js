const { logs, errors } = require('./logging');

module.exports.loaded = (moduleName) => {
    try {
        const result = require.resolve(moduleName);
        logs(`${moduleName} is loaded ${result}`)
        return true;
    } catch(e) {
        errors(`${moduleName} is not loaded ${e}`);
        return false;
    }
}