const {
    getRawWorkbookObjects,
    formatWorkbookByVersion,
    createTaxonomyTree,
} = require('../utils/raw-data-helpers');

const { filingDocumentTypes } = require('../utils/common-enums');
const { logs } = require('../utils/logging');

module.exports.crawlTaxonomyXlsxSheet = async (path, sheet, version) => {
    let result = {};
    // todo: determine document type from available fields in sheet being parsed
    // todo: store raw workbook objects that are less io heavy; should help
    // with load times when reparsing workbooks
    let objects = await getRawWorkbookObjects(path, sheet);

    const seedDocumentTypes = isValid && [documentType] || filingDocumentTypes;
    logs(`seeing identifiers from the following document types: ${seedDocumentTypes.join(', ')}`);

    for (let type of seedDocumentTypes) {
        identifiers = formatWorkbookByVersion(objects, type, version);
        const topLevelIdentifiers = await createTaxonomyTree(identifiers, version);
        result[type] = topLevelIdentifiers;
    }

    return result;
}