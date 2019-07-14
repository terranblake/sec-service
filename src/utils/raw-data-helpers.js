const moment = require('moment');
const { map, reduce } = require('lodash');

const { parseString } = require('xml2js');
const request = require("request");

const {
    identifiers: Identifiers,
    companies: Companies,
    filings: Filings,
} = require('../models');
const { filingDocumentTypes } = require('../utils/common-enums');
const { logs, warns, errors } = require('../utils/logging');

const { companies, filings } = require('../controllers');

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
    definition = definition.split('-');
    return {
        id: definition[0].trim(),
        flag: definition[1].trim(),
        context: definition[2].trim(),
    };
}

const extractNameFromParent = (parent, prefix, hasColon) => parent.split(hasColon ? ':' : prefix).pop();

const extractDocumentTypeFromDescription = description =>
    description &&
    filingDocumentTypes.find(type =>
        new RegExp(type).test(description.toLowerCase())
    );

module.exports.formatRawIdentifiers = (identifiers, extensionType) => {
    extensionType = extensionType.toLowerCase();
    identifierSchema = identifiers.model.schema.obj;

    identifiers = map(identifiers, (identifier) => {
        // TODO :: Build out processor to handle every sheet
        //          in the taxonomy declaration documents
        // Use the following to remove all invalid properties
        // after switch statement formatters
        /*
            for (property in identifier) {
                if (!Object.keys(identifierSchema).includes(property)) {
                    delete identifier[property]
                }
            }
        */

        switch (extensionType) {
            // has most of the important identifiers
            case 'calculation':
                return {
                    extensionType,
                    extendedLinkRole: identifier['extended link role'],
                    definition: identifier['definition'],
                    prefix: identifier['prefix'],
                    name: identifier['name'],
                    label: identifier['label'],
                    depth: identifier['depth'],
                    order: identifier['order'],
                    weight: identifier['weight'],
                    parent: identifier['parent'],
                };
                break;
            // in depth definitions and supplementary information
            //  about each identifier e.g. documentation, type, periodType, etc.
            case 'elements':
                unitType = identifier.type && identifier.type.split(':')[1];
                // identifier.unitType = unitType && unitType.toLowerCase();

                // TODO :: Validate the correct unitType is being found and
                //          not some random one that we don't need

                identifier.abstract = identifier.abstract === 'true';
                identifier.extensionType = extensionType;

                for (property in identifier) {
                    if (!Object.keys(identifierSchema).includes(property)) {
                        delete identifier[property]
                    }
                }
                console.log({ identifier });
                return identifier;
                break;
        }
    })

    return identifiers;
}

module.exports.formatFilingDocuments = async (filingsDocuments, company, filing) => {
    const { refId, _id } = filing;

    let formattedDocuments = await reduce(filingsDocuments, async (filteredP, document) => {
        const filtered = await filteredP;

        const description =
            document.description ||
            document['$'] &&
            document['$']['edgar:description'] ||
            false;

        const docuumentType = extractDocumentTypeFromDescription(description);
        if (docuumentType) {
            document = {
                filing: _id,
                company: company._id,
                type: docuumentType || undefined,
                status: 'unprocessed',
                sequenceNumber: document.sequence || document['$']['edgar:sequence'],
                fileName: document.fileName || document['$']['edgar:file'],
                fileType: document.fileType || document['$']['edgar:type'],
                fileSize: document.fileSize || document['$']['edgar:size'],
                fileDescription: description,
                fileUrl: document.url || document['$']['edgar:url'],
            };

            filtered.push(_id);
        } else {
            warns(`invalid document type from description ${description} refId ${refId}`)
        }

        // TODO :: Validate that the minimum
        //          documents have been retrieved
        return filtered;
    }, []);

    logs(`retrieved ${formattedDocuments.length} documents for company ${company.ticker} cik ${company.cik} refId ${refId}`);
    return formattedDocuments;
}

module.exports.scrapeFilingFromRssItem = async (source, rawRssItem) => {
    const cik = Number(rawRssItem.filing['edgar:cikNumber']);
    const accessionNumber = rawRssItem.filing['edgar:accessionNumber'][0];

    let foundCompany = await Companies.get({ refId: cik });
    if (!foundCompany) {
        foundCompany = await companies.getMetadata(cik);
        warns('skipping filing processing until ticker to cik conversion is stable');
        return false;
    }

    const foundFiling = await Filings.get({
        company: foundCompany && foundCompany._id || null,
        accessionNumber
    });

    if (Array.isArray(foundFiling) && foundFiling.length) {
        warns(`duplicate filing company ${foundCompany.ticker} cik ${cik} accessionNumber ${accessionNumber}. bailing!`);
        return false;
    }

    let filing = this.formatFilingBySource[source](rawRssItem, foundCompany._id);
    return filing;
}

module.exports.scrapeFilingFromSec = async (rssItem, company) => {
    let filing = {}

    parseString(rssItem.content, async (err, result) => {
        if (err) {
            console.error(`there was a problem parsing rss item for company ${company._id}`);
            return false;
        }

        const accessionNumber = result['accession-nunber'][0];
        const { ticker, _id } = company;

        const filingMetadata = filings.getMetadata(ticker, accessionNumber);

        filing = {
            company: _id,
            publishedAt: rssItem.pubDate,
            ...filingMetadata
        }
    });

    return filing;
}

module.exports.loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

module.exports.loadidentifiersFromSheet = async (path, sheet, next) => {
    return require('./xlsx').parse(path, sheet, next);
}

module.exports.createGaapTaxonomyTree = async (tree) => {
    const sortedTree = sortTree(tree);
    logs('finished sorting tree');
    logs('started creating gaap taxonomy tree');

    let depthC = 0;
    for (let leaf in sortedTree) {
        leaf = sortedTree[leaf];

        if (leaf.depth > depthC) {
            logs(`creating depth ${depthC} leaves`);
            depthC++;
        }

        if (leaf.depth != 0) {
            leaf.definition = extractDefitionObjectFromString(leaf.definition);
            leaf.parent = extractNameFromParent(leaf.parent, leaf.prefix, true);
            leaf.parent = await Identifiers.findParentIdentifier(leaf);
            leaf.parent && logs(`found parent identifier for ${leaf.name} depth ${leaf.depth - 1} parent ${leaf.parent}`);
        } else {
            logs(`top-level element ${leaf.name} depth ${leaf.depth - 1}`);
        }

        await Identifiers.create(leaf);
    };

    logs('finished creating gaap taxonomy tree');
}

module.exports.download = (extensionLink, parsingOptions, parse = true) => {
    return new Promise((resolve, reject) => {
        let data = "";

        request
            .get(extensionLink)
            .on('response', (response) => {
                logs(`\tdownloading ${extensionLink}`);
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logs(`\tdownloaded ${extensionLink}`);
                    if (parse) {
                        parseString(data, parsingOptions, (err, result) => {
                            logs(`\t\tparsed ${extensionLink}`);
                            if (err) {
                                logs(err);
                            }

                            resolve(result);
                        });
                    }

                    resolve(data);
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