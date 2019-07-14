const { loadIdentifiersFromSheet, formatRawIdentifiers } = require('../utils/raw-data-helpers');
const { identifiers: Identifiers } = require('../models')();
const { filingDocumentTypes } = require('../utils/common-enums');
const { each } = require('lodash');

module.exports.seedTree = async (path, documentType) => {
    let result = {};
    const isValid = isValidType(documentType);

    if (documentType) {
        let identifiers = await loadIdentifiersFromSheet(path, documentType);
        identifiers = await formatRawIdentifiers(identifiers, documentType);

        await Identifiers.createAll(identifiers, isValid);
        result[documentType] = identifiers;
    } else {
        await each(filingDocumentTypes, async (documentType) => {
            let identifiers = loadIdentifiersFromSheet(path, documentType);
            identifiers = formatRawIdentifiers(identifiers, documentType);

            await Identifiers.createAll(identifiers);
            result[documentType] = identifiers;
        });
    }

    return result;
}

const isValidType = (documentType) => filingDocumentTypes.includes(documentType && documentType.toLowerCase())