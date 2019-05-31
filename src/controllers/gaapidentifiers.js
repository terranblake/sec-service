const { loadGaapIdentifiersFromSheet, formatRawGaapIdentifiers } = require('../utils/raw-data-helpers');
const { gaapIdentifiers } = require('../models');
const { taxonomyExtensionTypes } = require('../utils/common-enums');

const { each } = require('lodash');

module.exports.seedTree = async (path, extensionType) => {
    let result = {};
    const isValid = isValidType(extensionType);

    if (extensionType) {
        let identifiers = await loadGaapIdentifiersFromSheet(path, extensionType);
        identifiers = await formatRawGaapIdentifiers(identifiers, extensionType);

        await gaapIdentifiers.createAll(identifiers, isValid);
        result[extensionType] = identifiers;
    } else {
        const { taxonomyExtensionTypes } = require('../utils/common-enums');

        await each(taxonomyExtensionTypes, async (extensionType) => {
            let identifiers = loadGaapIdentifiersFromSheet(path, extensionType);
            identifiers = formatRawGaapIdentifiers(identifiers, extensionType);

            await gaapIdentifiers.createAll(identifiers);
            result[extensionType] = identifiers;
        });
    }

    return result;
}

const isValidType = (extensionType) =>
    taxonomyExtensionTypes.includes(extensionType && extensionType.toLowerCase())