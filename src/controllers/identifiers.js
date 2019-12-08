const {
    loadIdentifiersFromSheet,
    formatRawIdentifiers,
    createTaxonomyTree,
} = require('../utils/raw-data-helpers');

const { filingDocumentTypes } = require('../utils/common-enums');
const { logs } = require('../utils/logging');

module.exports.seedTree = async (path, documentType) => {
    let result = {};
    const isValid = isValidType(documentType);

    const seedDocumentTypes = isValid && [documentType] || filingDocumentTypes;
    logs(`seeing identifiers from the following document types: ${seedDocumentTypes.join(', ')}`);

    for (let type of seedDocumentTypes) {
        let identifiers = await loadIdentifiersFromSheet(path, type);
        identifiers = formatRawIdentifiers(identifiers, type);

        const topLevelIdentifiers = await createTaxonomyTree(identifiers);
        result[type] = topLevelIdentifiers;
    }

    return result;
}

const isValidType = (documentType) => filingDocumentTypes.includes(documentType && documentType.toLowerCase())