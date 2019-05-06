const { loadGaapIdentifiersFromJson, formatRawGaapIdentifiers } = require('../utils/raw-data-helpers');
const { gaapIdentifier: { methods } } = require('../models');

const { each } = require('lodash');

const logs = console.log.bind(console);
const errors = console.log.bind(console);

const seedTree = async (path, extensionType) => {
    let result = {};

    if (extensionType) {
        let identifiers = await loadGaapIdentifiersFromJson(path, extensionType);
        identifiers = await formatRawGaapIdentifiers(identifiers, extensionType);
        await methods.createAll(identifiers);
        result[extensionType] = identifiers;

    } else {
        const { taxonomyExtensionTypes } = require('../utils/common-enums');
        await each(taxonomyExtensionTypes, (extensionType) => {
            let identifiers = loadGaapIdentifiersFromJson(path, extensionType);
            identifiers = formatRawGaapIdentifiers(identifiers, extensionType);
            methods.createAll(identifiers);
            result[extensionType] = identifiers;
        });
    }

    return result;
}

module.exports = {
    seedTree,
}