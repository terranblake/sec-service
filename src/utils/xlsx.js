const { logs } = require('../utils/logging');

// TODO :: Create job and listen for events
module.exports.parse = (filePath, sheetName) => {
    const hrStart = process.hrtime();

    logs(`parsing sheet ${sheetName}`);

    var XLSX = require('xlsx');
    var workbook = XLSX.readFile(filePath);

    var sheet_name_list = workbook.SheetNames;
    logs(`found the following sheets ${sheet_name_list}`);

    workbookIndex = sheet_name_list.indexOf(sheetName);
    workbookJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[workbookIndex]]);

    const hrend = process.hrtime(hrstart)
    logs(`parsed sheet ${sheetName} path ${filePath} in ${hrend[0]}s ${hrend[1] / 1000000}ms`);
    return workbookJson;
}