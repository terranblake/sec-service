const { loadIdentifiersFromSheet, formatRawIdentifiers } = require('../utils/raw-data-helpers');
const { Identifiers } = require('../models');
const { taxonomyExtensionTypes } = require('../utils/common-enums');

const { each } = require('lodash');

module.exports.seedTree = async (path, extensionType) => {
    let result = {};
    const isValid = isValidType(extensionType);

    if (extensionType) {
        let identifiers = await loadIdentifiersFromSheet(path, extensionType);
        identifiers = await formatRawIdentifiers(identifiers, extensionType);

        await Identifiers.createAll(identifiers, isValid);
        result[extensionType] = identifiers;
    } else {
        const { taxonomyExtensionTypes } = require('../utils/common-enums');

        await each(taxonomyExtensionTypes, async (extensionType) => {
            let identifiers = loadIdentifiersFromSheet(path, extensionType);
            identifiers = formatRawIdentifiers(identifiers, extensionType);

            await Identifiers.createAll(identifiers);
            result[extensionType] = identifiers;
        });
    }

    return result;
}

const isValidType = (extensionType) =>
    taxonomyExtensionTypes.includes(extensionType && extensionType.toLowerCase())