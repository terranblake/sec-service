const moment = require('moment');
const { map, reduce } = require('lodash');
const { series } = require('async');
const request = require("request");
const { parseString } = require('xml2js');
const { promisify } = require('util');
const xlsx = require('xlsx');

const identifiers = require('../models/identifiers');
const companies = require('../models/companies');
const filings = require('../models/filings');

const { getMetadata } = require('./metadata');
const { filingDocumentTypes } = require('./common-enums');
const { logs, errors } = require('./logging');
const { workbookFormatters } = require('./workbook-helpers');

module.exports.formatFilingBySource = (source, filingObj, company) => ({
    'sec': {
        source,
        company,
        type: filingObj.filing['edgar:formType'][0],
        refId: filingObj.filing['edgar:accessionNumber'][0],
        period: moment(filingObj.filing['edgar:period'], 'YYYYMMDD').format(),
        fiscalYearEnd: filingObj.filing['edgar:fiscalYearEnd'] && moment(filingObj.filing['edgar:fiscalYearEnd'], 'MMDD').format() || null,
        url: filingObj.link,
        name: filingObj.title,
        publishedAt: moment(filingObj.pubDate, 'dddd, DD').format(),
        filedAt: moment(filingObj.filing['edgar:filingDate'], 'MM/DD/YYYY').format(),
        acceptedAt: moment(filingObj.filing['edgar:acceptanceDatetime'], 'YYYYMMDDHHmm').format(),
        accessionNumber: filingObj.filing['edgar:accessionNumber'][0],
        fileNumber: filingObj.filing['edgar:fileNumber'][0],
    }
}[source]);

const extractDefitionObjectFromString = (definition) => {
    definition = definition
        && definition.split('-')
        || [];
    return {
        id: definition[0].trim(),
        flag: definition[1].trim(),
        context: definition[2].trim(),
    };
}

module.exports.formatWorkbookByVersion = (rawObjects, extensionType, version) => {
    extensionType = extensionType.toLowerCase();
    const formatter = workbookFormatters[version];

    // todo: move all objects within scope of the formatter since
    // some versions of workbooks are going to require a current
    // role name since there isn't a guaranteed column for that data
    return map(rawObjects, formatter(identifier));
}

module.exports.formatFilingDocuments = async (filingsDocuments, company, filing) =>
    reduce(filingsDocuments, (acc, document) => {
        const description =
            document.description ||
            document['$'] &&
            document['$']['edgar:description'] ||
            false;

        const documentType = description && filingDocumentTypes.find(type => new RegExp(type).test(description.toLowerCase()));
        if (!documentType) {
            errors(`invalid document type from description ${description} filing ${filing}`);
            return acc;
        }

        acc.push({
            filing,
            company: company._id,
            type: documentType || undefined,
            status: 'seeded',
            sequenceNumber: document.sequence || document['$']['edgar:sequence'],
            fileName: document.fileName || document['$']['edgar:file'],
            fileType: document.fileType || document['$']['edgar:type'],
            fileSize: document.fileSize || document['$']['edgar:size'],
            fileDescription: description,
            fileUrl: document.url || document['$']['edgar:url'],
        });

        // todo: Validate that the minimum documents have been retrieved
        return acc;
    }, []);

module.exports.scrapeFilingFromRssItem = async (source, rawRssItem) => {
    const cik = Number(rawRssItem.filing['edgar:cikNumber']);
    const accessionNumber = rawRssItem.filing['edgar:accessionNumber'][0];

    let foundCompany = await companies.model.find({ refId: cik });
    if (!foundCompany) {
        foundCompany = await getMetadata('companies', cik);
        errors('skipping filing processing until ticker to cik conversion is stable');
        return false;
    }

    const foundFiling = await filings.model.find({ company: foundCompany._id, accessionNumber });
    if (Array.isArray(foundFiling) && foundFiling.length) {
        errors(`duplicate filing company ${foundCompany.ticker} cik ${cik} accessionNumber ${accessionNumber}. bailing!`);
        return false;
    }

    let filing = this.formatFilingBySource[source](rawRssItem, foundCompany._id);
    return filing;
}

module.exports.parseXmlString = promisify(parseString);

module.exports.parseRssEntry = async (rssEntry, accessionNumber, company) => {
    let filing = {}
    let { ticker, _id } = company;

    // const { div: parsedRssEntry } = await this.parseXmlString(rssEntry.content);
    const filingMetadata = await getMetadata('filings', ticker, accessionNumber);

    filing = {
        company: _id,
        publishedAt: moment(rssEntry.pubDate).format(),
        fiscalYearEnd: moment(filingMetadata.fiscalYearEnd, 'MMYY').format(),
        ...filingMetadata
    }

    return filing;
}

module.exports.loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

module.exports.getRawWorkbookObjects = async (path, sheet) => {
    const hrstart = process.hrtime();

    logs(`loading workbook ${sheet} ${path}`);
    const workbook = xlsx.readFile(path);

    logs(`loaded workbook ${path}`);

    const sheets = workbook.SheetNames;

    const sheetRegex = new RegExp(sheet, 'i');
    const matchedSheet = sheets.find(s => sheetRegex.test(s));

    if (!matchedSheet) {
        throw `no sheet found that matches the provided sheet name. please try again!`;
    }

    workbookIndex = sheets.indexOf(matchedSheet);
    workbookJson = xlsx.utils.sheet_to_json(workbook.Sheets[matchedSheet]);

    const hrend = process.hrtime(hrstart)
    logs(`loaded workbook in ${hrend[0]}s ${hrend[1] / 1000000}ms`);

    return workbookJson;
}

module.exports.createTaxonomyTree = async (tree, version) => {
    const topLevelIdentifiers = [];
    const sortedTree = sortTree(tree);
    logs('finished sorting tree');
    logs('started creating gaap taxonomy tree');

    let depthC = 0;
    for (let identifier of sortedTree) {
        const { depth, definition, name, parent } = identifier;
        identifier.version = version;

        if (depth > depthC) {
            logs(`creating depth ${depthC} leaves`);
            depthC++;
        }

        // todo: no longer populating defintion object. this field
        // now lives in the role object on the identifier model
        const { id: roleId } = extractDefitionObjectFromString(definition);
        if (identifier.role) {
            identifier.role.id = roleId;
        }

        const parentIdentifierName = parent && parent.split(':').pop();
        if (parentIdentifierName) {
            logs(`found parent identifier for ${name} depth ${depth - 1} parent ${identifier.parentIdentifierName}`);
            identifier.parent = parentIdentifierName;
        }

        logs(`creating identifier ${identifier.name}`);
        identifier = await identifiers.model.create(identifier);

        if (depth === 0) {
            logs(`top-level element ${name} depth ${depth - 1}`);
            topLevelIdentifiers.push(identifier);
        }
    };

    logs('finished creating gaap taxonomy tree');
    return topLevelIdentifiers;
}

module.exports.download = (extensionLink, progress = 1 /* log every 1 mb */) => {
    logs({ message: `downloading file from ${extensionLink}` });

    return new Promise((resolve, reject) => {
        let data = "";

        request
            .get(extensionLink)
            .on('response', (response) => {
                let cur = 0;

                logs(`\tdownloading ${extensionLink}`);
                response.on('data', (chunk) => {
                    data += chunk;
                    cur += chunk.length;

                    const megaBytes = (cur / 1048576).toFixed(2);

                    if (progress && megaBytes % progress === 0) {
                        logs({ message: `Downloaded ${megaBytes}mb` });
                    }
                });

                response.on('end', () => {
                    logs(`\tdownloaded ${extensionLink}`);
                    return resolve(data);
                });
            })
            .on('error', (err) => reject(err));
    });
}

module.exports.saveExtension = (type, data) => require('fs').writeFileSync(`./data/test/${type}.json`, JSON.stringify(data));

const sortTree = (tree) => {
    logs('started sorting tree');
    return tree.sort(function (a, b) {
        const depthA = a.depth, depthB = b.depth;
        if (depthA < depthB)
            return -1;
        if (depthA > depthB)
            return 1;
        return 0;
    });
}

module.exports.parseUnitsUpdate = (units) => {
    for (let id in units) {
        unit = units[id];

        unit = {
            identifier: unit.unitId,
            name: unit.unitName,
            type: unit.itemType,
            nsUnit: unit.nsUnit,
            nsItemType: unit.nsItemType,
            symbol: unit.symbol,
            definition: unit.definition,
            typeDate: unit.itemTypeDate,
            versionDate: unit.versionDate,
            baseStandard: unit.baseStandard
        };

        units[id] = unit;
    }

    return units;
}