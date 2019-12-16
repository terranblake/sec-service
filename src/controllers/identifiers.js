const {
    getRawWorkbookObjects,
    formatWorkbookByVersion,
    createTaxonomyTree,
} = require('../utils/raw-data-helpers');

const { filingDocumentTypes } = require('../utils/common-enums');
const { logs } = require('../utils/logging');

module.exports.seedTree = async (path, documentType, version) => {
    let result = {};
    const isValid = isValidType(documentType);

    // extracts workbook objects from xlsx, then orders the
    // object 
    let objects = await getRawWorkbookObjects(path, version);

    const seedDocumentTypes = isValid && [documentType] || filingDocumentTypes;
    logs(`seeing identifiers from the following document types: ${seedDocumentTypes.join(', ')}`);

    for (let type of seedDocumentTypes) {
        identifiers = formatWorkbookByVersion(objects, type, version);
        const topLevelIdentifiers = await createTaxonomyTree(identifiers, version);
        result[type] = topLevelIdentifiers;
    }

    return result;
}

const isValidType = (documentType) => filingDocumentTypes.includes(documentType && documentType.toLowerCase())