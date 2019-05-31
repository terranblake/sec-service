const moment = require('moment');
const { map, reduce } = require('lodash');

const { parseString } = require('xml2js');
const request = require("request");

const { gaapIdentifiers, companies, filings, taxonomyExtensions, contexts, facts, units } = require('../models');
const { taxonomyExtensionTypes } = require('../utils/common-enums');
const { logs, warns, errors } = require('../utils/logging');
const { formatContexts, formatFacts, formatUnits } = require('./taxonomy-extension-helpers');

const { getCompanyMetadata } = require('../controllers/companies');

const formatRawFiling = (filingObj, taxonomyExtensions, company) => {
    return {
        source: 'sec',
        sourceLink: filingObj.link,
        publishTitle: filingObj.title,
        publishedAt: moment(filingObj.pubDate, 'dddd, DD'),
        type: filingObj.filing['edgar:formType'][0],
        filingDate: moment(filingObj.filing['edgar:filingDate'], 'MM/DD/YYYY'),
        accessionNumber: filingObj.filing['edgar:accessionNumber'][0],
        fileNumber: filingObj.filing['edgar:fileNumber'][0],
        acceptanceDatetime: moment(filingObj.filing['edgar:acceptanceDatetime'], 'YYYYMMDDHHmm'),
        period: moment(filingObj.filing['edgar:period'], 'YYYYMMDD'),
        assistantDirector:
            filingObj.filing['edgar:assistantDirector'] && filingObj.filing['edgar:assistantDirector'][0] || null,
        assignedSic: filingObj.filing['edgar:assignedSic'] && filingObj.filing['edgar:assignedSic'][0] || null,
        fiscalYearEnd: filingObj.filing['edgar:fiscalYearEnd'] && moment(filingObj.filing['edgar:fiscalYearEnd'], 'MMDD') || null,
        taxonomyExtensions,
        company
    };
}

const extractDefitionObjectFromString = (definition) => {
    definition = definition.split('-');
    return {
        id: definition[0].trim(),
        flag: definition[1].trim(),
        context: definition[2].trim(),
    };
}

const extractNameFromParent = (parent, prefix, hasColon) => parent.split(hasColon ? ':' : prefix).pop();

const extractExtensionTypeFromDescription = description =>
    description &&
    taxonomyExtensionTypes.find(type =>
        new RegExp(type).test(description.toLowerCase())
    );

module.exports.formatRawGaapIdentifiers = (identifiers, extensionType) => {
    extensionType = extensionType.toLowerCase();
    gaapIdentifierSchema = gaapIdentifiers.model.schema.obj;

    identifiers = map(identifiers, (identifier) => {
        // TODO :: Build out processor to handle every sheet
        //          in the taxonomy declaration documents
        // Use the following to remove all invalid properties
        // after switch statement formatters
        /*
            for (property in identifier) {
                if (!Object.keys(gaapIdentifierSchema).includes(property)) {
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
                    if (!Object.keys(gaapIdentifierSchema).includes(property)) {
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

const createTaxonomyExtensions = async (extensionObjs, company, accessionNumber) => {
    let createdExtensions = [];
    createdExtensions = await reduce(extensionObjs, async (filteredP, extension) => {
        const filtered = await filteredP;
        // TODO :: Handle reformatting of file more succinctly
        //          instead of breaking if it the extension
        //          doesn't match either format
        const description =
            extension.description ||
            extension['$'] &&
            extension['$']['edgar:description'] ||
            false;

        const extensionType = extractExtensionTypeFromDescription(description);
        if (extensionType) {
            extension = {
                company: company && company._id || null,
                description,
                type: extensionType || undefined,
                sequence: extension.sequence || extension['$']['edgar:sequence'],
                fileName: extension.fileName || extension['$']['edgar:file'],
                fileType: extension.fileType || extension['$']['edgar:type'],
                fileSize: extension.fileSize || extension['$']['edgar:size'],
                url: extension.url || extension['$']['edgar:url'],
                status: extension.status || 'unprocessed',
            };

            const { _id } = await taxonomyExtensions.create(extension);
            filtered.push(_id);
        } else {
            warns(`invalid extension type from description ${description} accessionNumber ${accessionNumber}`)
        }

        // TODO :: Validate that the minimum
        //          extensions have been retrieved
        return filtered;
    }, []);

    logs(`retrieved ${createdExtensions.length} extensions for company ${company.ticker} cik ${company.cik} accessionNumber ${accessionNumber}`);
    return createdExtensions;
}

module.exports.scrapeFilingFromRssItem = async (rawRssItem) => {
    const cik = Number(rawRssItem.filing['edgar:cikNumber']);
    const accessionNumber = rawRssItem.filing['edgar:accessionNumber'][0];

    let foundCompany = await companies.findByCik(cik);
    if (!foundCompany) {
        foundCompany = await getCompanyMetadata(cik);

        warns('skipping filing processing until ticker to cik conversion is stable');
        foundCompany = null;
    }

    if (foundCompany) {
        const foundFiling = await filings.get({
            company: foundCompany && foundCompany._id || null,
            accessionNumber
        });

        if (Array.isArray(foundFiling) && foundFiling.length) {
            warns(`duplicate filing company ${foundCompany.ticker} cik ${cik} accessionNumber ${accessionNumber}`);
            return;
        }

        // Format raw extension files
        let extensions = rawRssItem.filing['edgar:xbrlFiles'][0][['edgar:xbrlFile']];
        extensions = await createTaxonomyExtensions(extensions, foundCompany, accessionNumber);

        // format raw filing data and append
        //  taxonomy extensions to object
        let filing = formatRawFiling(rawRssItem, extensions, foundCompany._id);
        return filing;
    } else {
        errors(`company could not be found cik ${cik}`);
    }

    return false;
}

module.exports.scrapeFilingFromSec = async (rssItem, company) => {
    let filing = {}
    const { _id, ticker } = company;

    parseString(rssItem.content, (err, result) => {
        result = result.div;

        filing = {
            company: _id,
            source: 'sec',
            sourceLink: rssItem.link,
            publishTitle: rssItem.title,
            publishedAt: rssItem.pubDate,
            type: result['filing-type'][0],
            filingDate: result['filing-date'][0],
            accessionNumber: result['accession-nunber'][0],
            fileNumber: result['file-number'][0],
        }
    });

    // TODO :: Provide the remaining data from metadata-service
    // acceptanceDatetime:
    // period:
    // assistantDirector:
    // assignedSic:
    // fiscalYearEnd:

    const extensions = await this.getFilingMetadata(ticker, filing.accessionNumber);
    filing.taxonomyExtensions = await createTaxonomyExtensions(extensions, company, filing.accessionNumber);
    return filing;
}

module.exports.loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

module.exports.loadGaapIdentifiersFromSheet = async (path, sheet, next) => {
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
            leaf.parent = await gaapIdentifiers.findParentIdentifier(leaf);
            leaf.parent && logs(`found parent identifier for ${leaf.name} depth ${leaf.depth - 1} parent ${leaf.parent}`);
        } else {
            logs(`top-level element ${leaf.name} depth ${leaf.depth - 1}`);
        }

        await gaapIdentifiers.create(leaf);
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

module.exports.processExtension = async (filingId, companyId, type, elements) => {
    // TODO :: this probably won't work for everything
    elements = elements["xbrli:xbrl"] || elements.xbrl;

    // don't support other types until
    //  instance parsing is stable
    if (type === 'instance') {
        // format units
        let rawUnits = elements["xbrli:unit"] || elements.unit;;
        validUnits = await formatUnits(rawUnits, filingId, companyId);

        // TODO :: this probably won't work for everything
        let rawContexts = elements['xbrli:context'] || elements.context;
        let newContexts = formatContexts(rawContexts, filingId, companyId);
        newContexts = await contexts.createAll(newContexts);

        // format facts
        let newFacts = await formatFacts(elements, validUnits, type, filingId, companyId);
        newFacts = await facts.createAll(newFacts);
        return facts;
    }
}

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

module.exports.getFilingMetadata = (ticker, accessionNumber) => {
    const config = require('config');
    // TODO :: Add metadata-service to encrypted config
    const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';
    const endpoint = `${metadataService}/filings?ticker=${ticker}&accessionNumber=${accessionNumber}`;

    return new Promise((resolve, reject) => {
        let data = "";
        request
            .get(endpoint)
            .on('response', (response) => {
                logs(`retrieving metadata for ${accessionNumber}`);
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logs(`retrieved metadata for ${accessionNumber}`);
                    data = JSON.parse(data);
                    resolve(data);
                });
            })
            .on('error', (err) => reject(err));
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