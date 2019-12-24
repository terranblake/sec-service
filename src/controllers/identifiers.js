const xlsx = require('xlsx');

const {
    createTaxonomyTree,
    getRawIdentifiersFromSheet,
} = require('../utils/raw-data-helpers');

const { enums } = require('@postilion/utils');
const workbookParsers = require('../utils/workbook-parsers');

module.exports.crawlTaxonomyXlsxSheet = async (path, sheet, version) => {
    // todo: determine document type from available fields in sheet being parsed
    // todo: store raw workbook objects that are less io heavy; should help
    // with load times when reparsing workbooks
    const sheets = sheet && [sheet] || enums.filingDocumentTypes;
    const workbook = xlsx.readFile(path);

    for (let type of sheets) {
        const rawIdentifiers = await getRawIdentifiersFromSheet(workbook, sheet);
        const formattedIdentifiers = workbookParsers[version](rawIdentifiers, type, version).filter(i => i && i.label);
        await createTaxonomyTree(formattedIdentifiers, version);
    }
}