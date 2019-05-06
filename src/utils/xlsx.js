const logs = console.log.bind(console);

module.exports.parse = (filePath, sheetName) => {
    logs(`[server] parsing sheet ${sheetName}`);

    var XLSX = require('xlsx');
    var workbook = XLSX.readFile(filePath);

    var sheet_name_list = workbook.SheetNames;
    logs(`[server] found the following sheets ${sheet_name_list}`);

    workbookIndex = sheet_name_list.indexOf(sheetName);
    workbookJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[workbookIndex]]);
    logs(`[server] parsed sheet ${sheetName}`);

    return workbookJson;
}