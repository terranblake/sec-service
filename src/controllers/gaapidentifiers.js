const { loadGaapIdentifiersFromJson, formatRawGaapIdentifiers } = require('../utils/raw-data-helpers');
const { gaapIdentifiers } = require('../models');
const { taxonomyExtensionTypes } = require('../utils/common-enums');

const { each } = require('lodash');

module.exports.seedTree = async (path, extensionType) => {
    let result = {};
    const isValidType = taxonomyExtensionTypes.includes(extensionType.toLowerCase());

    if (extensionType && isValidType) {
        let identifiers = await loadGaapIdentifiersFromJson(path, extensionType);
        identifiers = await formatRawGaapIdentifiers(identifiers, extensionType);

        await gaapIdentifiers.createAll(identifiers);
        result[extensionType] = identifiers;
    } else {
        const { taxonomyExtensionTypes } = require('../utils/common-enums');

        await each(taxonomyExtensionTypes, (extensionType) => {
            let identifiers = loadGaapIdentifiersFromJson(path, extensionType);
            identifiers = formatRawGaapIdentifiers(identifiers, extensionType);

            gaapIdentifiers.createAll(identifiers);
            result[extensionType] = identifiers;
        });
    }

    return result;
}