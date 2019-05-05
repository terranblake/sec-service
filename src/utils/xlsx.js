const log = console.log.bind(console);

module.exports.parse = (filePath) => {
    log(`[server] parsing ${filePath}`);

    var XLSX = require('xlsx');
    var workbook = XLSX.readFile(`${filePath}`);
    log(`[server] parsed ${filePath}`);

    var sheet_name_list = workbook.SheetNames;

    workbookIndex = sheet_name_list.indexOf('Calculation');
    workbookJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[workbookIndex]]);
    return JSON.stringify(workbookJson)
}