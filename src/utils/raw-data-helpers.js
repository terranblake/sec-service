const moment = require('moment');
const { map, reduce } = require('lodash');
const { series } = require('async');

const { parseString } = require('xml2js');
const request = require("request");

const {
    identifiers: Identifiers,
    companies: Companies,
    filings: Filings,
} = require('../models')();
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

const extractNameFromParent = (parent, prefix, hasColon) => parent.split(hasColon ? ':' : prefix).pop();

const extractDocumentTypeFromDescription = description =>
    description &&
    filingDocumentTypes.find(type =>
        new RegExp(type).test(description.toLowerCase())
    );

module.exports.formatRawIdentifiers = (identifiers, extensionType) => {
    extensionType = extensionType.toLowerCase();
    identifierSchema = Identifiers.model.schema.obj;

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
                    documentType: extensionType,
                    extendedLinkRole: identifier['extended link role'],
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
                break;
            // in depth definitions and supplementary information
            //  about each identifier e.g. documentation, type, periodType, etc.
            case 'elements':
                unitType = identifier.type && identifier.type.split(':')[1];
                // identifier.unitType = unitType && unitType.toLowerCase();

                // TODO :: Validate the correct unitType is being found and
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
                break;
        }
    })

    return identifiers;
}

module.exports.formatFilingDocuments = async (filingsDocuments, company, filing) =>
    reduce(filingsDocuments, (acc, document) => {
        const description =
            document.description ||
            document['$'] &&
            document['$']['edgar:description'] ||
            false;

        const docuumentType = extractDocumentTypeFromDescription(description);
        if (docuumentType) {
            document = {
                filing,
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

            acc.push(document);
        } else {
            warns(`invalid document type from description ${description} filing ${filing}`)
        }

        // TODO :: Validate that the minimum
        //          documents have been retrieved
        return acc;
    }, []);

module.exports.scrapeFilingFromRssItem = async (source, rawRssItem) => {
    const cik = Number(rawRssItem.filing['edgar:cikNumber']);
    const accessionNumber = rawRssItem.filing['edgar:accessionNumber'][0];

    let foundCompany = await Companies.get({ refId: cik });
    if (!foundCompany) {
        foundCompany = await getMetadata('companies', cik);
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
            leaf.definition = leaf.definition && extractDefitionObjectFromString(leaf.definition);
            leaf.parent = leaf.parent && extractNameFromParent(leaf.parent, leaf.prefix, true);
            leaf.parent = leaf.parent && await Identifiers.findParentIdentifier(leaf);
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