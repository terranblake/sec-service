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

module.exports.signum = (decimals) => {
    let sign = decimals && decimals !== 0 && decimals.slice(0, 1);
    sign = sign === '-' ? '-' : decimals !== 0 ? '+' : '-';

    return sign;
}

module.exports.magnitude = (value, decimals, sign) => {
    if (decimals && !['+', '-'].includes(sign)) {
        errors(`cannot normalize[${value}] without +/- sign[${sign}] in decimals[${decimals}]`);
        return value;
    }

    places = decimals.slice(1);
    scalar =
        sign === '-' ?
            // postive scalar
            Math.pow(10, Number(places)) :
            // stripped decimals isn't 0
            places !== '' ?
                // negative scalar
                Math.pow(10, Number(-1 * places)) :
                // neutral
                1;

    return Number(value) * scalar;
}