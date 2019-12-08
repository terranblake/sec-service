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
    sign = sign === '-'
        ? '-' 
        : decimals !== 0 
            ? '+' 
            : '-';

    return sign;
}

module.exports.magnitude = (value, decimals, sign) => {
    // if the value ends in a zero, then it has already been
    // rounded and doesn't need to be adjusted
    if (Number(String(value).slice(value.length - 1)) === 0) {
        return Number(value);
    }

    if (decimals && !['+', '-'].includes(sign)) {
        errors(`cannot normalize[${value}] without +/- sign[${sign}] in decimals[${decimals}]`);
        return value;
    }

    places = decimals.slice(1);
    scalar =
        sign === '-'
            ? Math.pow(10, Number(places))
            : places !== ''
                ? Math.pow(10, Number(-1 * places))
                : 1;

    return Number(value) * scalar;
}