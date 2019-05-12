const moment = require('moment');
const { map, reduce } = require('lodash');

const { gaapIdentifiers, companies, filings, taxonomyExtensions } = require('../models');

const logs = console.log.bind(console);
const errors = console.log.bind(console);
const { taxonomyExtensionTypes } = require('../utils/common-enums');

const formatRawFiling = (filingObj, taxonomyExtensions, company) => {
    return {
        source: 'sec',
        sourceLink: filingObj.link,
        publishTitle: filingObj.title,
        publishedAt: moment(filingObj.pubDate, 'dddd, DD'),
        filingType: filingObj.filing['edgar:formType'][0],
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
    taxonomyExtensionTypes.find(type =>
        new RegExp(type).test(description.toLowerCase())
    );

module.exports.formatRawGaapIdentifiers = (identifiers, extensionType) => {
    identifiers = map(identifiers, (identifier) => {
        // process all missing or relational data
        identifier = {
            extensionType: extensionType.toLowerCase(),
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

        return identifier;
    })

    return identifiers;
}

const aggregateTaxonomyExtensions = async (company, extensionObjs) => {
    let createdExtensions = [];
    createdExtensions = await reduce(extensionObjs, async (filteredP, extension) => {
        const filtered = await filteredP;
        const description = extension['$']['edgar:description'];
        const extensionType = extractExtensionTypeFromDescription(description);

        if (extensionType) {
            extension = {
                company: company && company._id || null,
                description,
                extensionType,
                sequence: extension['$']['edgar:sequence'],
                fileName: extension['$']['edgar:file'],
                fileType: extension['$']['edgar:type'],
                fileSize: extension['$']['edgar:size'],
                url: extension['$']['edgar:url'],
                elementStatus: 'unprocessed',
            };

            logs({ extension });

            const { _id } = await taxonomyExtensions.create(extension);
            filtered.push(_id);
        }
        return filtered;
    }, []);

    return createdExtensions;
}

module.exports.processRawRssItem = async (rawRssItem) => {
    const cik = Number(rawRssItem.filing['edgar:cikNumber']);
    const accessionNumber = rawRssItem.filing['edgar:accessionNumber'][0];

    const foundCompany = await companies.findByCik(cik);
    if (foundCompany) {
        const foundFiling = await filings.get({
            company: foundCompany && foundCompany._id || null,
            accessionNumber
        });

        if (Array.isArray(foundFiling) && foundFiling.length) {
            logs(`[server] already processed filing for company ${foundCompany.name} cik ${cik} accessionNumber ${accessionNumber}`);
            return null;
        }

        // Format raw extension files
        let extensions = rawRssItem.filing['edgar:xbrlFiles'][0][['edgar:xbrlFile']];
        extensions = await aggregateTaxonomyExtensions(foundCompany, extensions);

        // format raw filing data and append
        //  taxonomy extensions to object
        let filing = formatRawFiling(rawRssItem, extensions, foundCompany._id);
        logs({ before: filing });

        filing = await filings.create(filing);
        logs({ filing })
        return filing._id;
    } else {
        errors(`[server] company with CIK ${cik} could not be found.`);
    }

    return false;
}

module.exports.loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

module.exports.loadGaapIdentifiersFromJson = async (path, sheet, next) => {
    return require('./xlsx').parse(path, sheet, next);
}

module.exports.createByDepth = async (tree) => {
    logs('[server] started creating tree'.debug);
    const sortedTree = sortTree(tree);
    logs('[server] finished sorting tree'.debug);
    let depthC = 0;
    for (let leaf in sortedTree) {
        leaf = sortedTree[leaf];

        if (leaf.depth > depthC) {
            logs(`[server] creating depth ${depthC} leaves`.debug);
            depthC++;
        }

        if (leaf.depth != 0) {
            leaf.definition = extractDefitionObjectFromString(leaf.definition);
            leaf.parent = extractNameFromParent(leaf.parent, leaf.prefix, true);
            leaf.parent = await gaapIdentifiers.findParentIdentifier(leaf);
        } else {
            await logs('[server] is top-level element', `${leaf.name}`.help);
        }

        // await logs(`[server] depth ${leaf.depth} name ${leaf.name}`);
        await gaapIdentifiers.create(leaf);
    };
}

const sortTree = (tree) => {
    // logs('[server] started sorting tree');
    return tree.sort(function (a, b) {
        const depthA = a.depth, depthB = b.depth;
        if (depthA < depthB)
            return -1;
        if (depthA > depthB)
            return 1;
        return 0;
    });
}