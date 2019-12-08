const moment = require('moment');
const { map, reduce } = require('lodash');
const { series } = require('async');
const request = require("request");
const { parseString } = require('xml2js');

const identifiers = require('../models/identifiers');
const companies = require('../models/companies');
const filings = require('../models/filings');

const { getMetadata } = require('../utils/metadata');
const { filingDocumentTypes } = require('./common-enums');
const { logs, warns } = require('../utils/logging');

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

module.exports.formatRawIdentifiers = (rawIdentifiers, extensionType) => {
    extensionType = extensionType.toLowerCase();
    // identifierSchema = identifiers.model.schema.obj;

    rawIdentifiers = map(rawIdentifiers, (identifier) => {
        // TODO :: Build out processor to handle every sheet
        //          in the taxonomy declaration documents
        // Use the following to remove all invalid properties
        // after switch statement formatters
        /*
            for (property in identifier) {
                if (!Object.keys(rawIdentifierschema).includes(property)) {
                    delete identifier[property]
                }
            }
        */

        switch (extensionType) {
            // has most of the important rawIdentifiers
            case 'calculation':
                const extendedLinkRole = identifier['extended link role'];
                const [roleType, roleName] = extendedLinkRole.split('/').slice(-2);

                return {
                    documentType: extensionType,
                    extendedLinkRole: identifier['extended link role'],
                    role: {
                        type: roleType,
                        name: roleName
                    },
                    definition: identifier['definition'],
                    prefix: identifier['prefix'],
                    name: identifier['name'],
                    label: identifier['label'],
                    depth: identifier['depth'],
                    order: identifier['order'],
                    weight: identifier['weight'],
                    parent: identifier['parent'],
                    itemType: identifier['item type'] || 'monetaryItemType'
                };
            // in depth definitions and supplementary information
            //  about each identifier e.g. documentation, type, periodType, etc.
            case 'elements':
                unitType = identifier.type && identifier.type.split(':')[1];
                // identifier.unitType = unitType && unitType.toLowerCase();

                // todo: validate the correct unitType is being found and
                //          not some random one that we don't need

                identifier.documentType = extensionType,
                identifier.abstract = identifier.abstract === 'true';
                identifier.itemType = identifier['item type'] || 'monetaryItemType'

                for (property in identifier) {
                    if (!Object.keys(identifierSchema).includes(property)) {
                        delete identifier[property]
                    }
                }

                return identifier;
        }
    })

    return rawIdentifiers;
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
            warns(`invalid document type from description ${description} filing ${filing}`);
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
        warns('skipping filing processing until ticker to cik conversion is stable');
        return false;
    }

    const foundFiling = await filings.model.find({ company: foundCompany._id, accessionNumber });
    if (Array.isArray(foundFiling) && foundFiling.length) {
        warns(`duplicate filing company ${foundCompany.ticker} cik ${cik} accessionNumber ${accessionNumber}. bailing!`);
        return false;
    }

    let filing = this.formatFilingBySource[source](rawRssItem, foundCompany._id);
    return filing;
}

module.exports.scrapeFilingFromSec = (rssItem, company) => {
    return new Promise((resolve, reject) => {
        let filing = {}
        let accessionNumber
        let { ticker, _id } = company;

        series([
            function parseRssItem(next) {
                parseString(rssItem.content, (err, result) => {
                    if (err) {
                        console.error(`there was a problem parsing rss item for company ${company._id}`);
                        return false;
                    }

                    accessionNumber = result.div['accession-nunber'][0];
                    next();
                })
            },
            function getFilingMetadata(next) {
                getMetadata('filings', ticker, accessionNumber)
                    .then((filingMetadata) => {
                        filing = {
                            company: _id,
                            publishedAt: moment(rssItem.pubDate).format(),
                            ...filingMetadata
                        }
                        filing.fiscalYearEnd = moment(filing.fiscalYearEnd, 'MMYY').format();
                        console.log({ filing });

                        next();
                    });
            }
        ], (err, result) => {
            if (err) {
                return reject(err);
            }

            return resolve(filing);
        })
    })
}

module.exports.loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

module.exports.loadIdentifiersFromSheet = async (path, sheet, next) => {
    return require('./xlsx').parse(path, sheet, next);
}

module.exports.createTaxonomyTree = async (tree) => {
    const topLevelIdentifiers = [];
    const sortedTree = sortTree(tree);
    logs('finished sorting tree');
    logs('started creating gaap taxonomy tree');

    let depthC = 0;
    for (let identifier of sortedTree) {
        const { depth, definition, name, parent } = identifier;

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
        const parentIdentifier = await identifiers.findParentIdentifier(depth, parentIdentifierName, roleId);
        
        if (parentIdentifier) {
            logs(`found parent identifier for ${name} depth ${depth - 1} parent ${identifier.parent}`);
            identifier.parent = parentIdentifier;
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