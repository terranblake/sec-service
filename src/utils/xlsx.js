const { logs } = require('../utils/logging');

// TODO :: Update to handle parsing multiple
//          sheets without reloading the
//          entire file
module.exports.parse = (filePath, sheetName) => {
    const hrstart = process.hrtime();
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

    logs(`loading workbook ${sheetName} ${filePath}`);

    var XLSX = require('xlsx');
    var workbook = XLSX.readFile(filePath);
    
    logs(`loaded workbook ${filePath}`);

    var sheet_name_list = workbook.SheetNames;
    logs(`found the following sheets ${sheet_name_list}`);

    workbookIndex = sheet_name_list.indexOf(sheetName);
    workbookJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[workbookIndex]]);

    const hrend = process.hrtime(hrstart)
    logs(`loaded workbook in ${hrend[0]}s ${hrend[1] / 1000000}ms`);
    return workbookJson;
}