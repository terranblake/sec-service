const moment = require('moment');
const { map, each } = require('lodash');

const { gaapIdentifier } = require('../models');

const logs = console.log.bind(console);
const errors = console.log.bind(console);

const formatRawFiling = (filingObj) => {
    return {
        source: 'sec',
        sourceLink: filingObj.link,
        publishTitle: filingObj.title,
        publishedAt: moment(filingObj.pubDate, 'dddd, DD'),
        formType: filingObj.filing['edgar:formType'][0],
        filingDate: moment(filingObj.filing['edgar:filingDate'], 'MM/DD/YYYY'),
        accessionNumber: filingObj.filing['edgar:accessionNumber'][0],
        fileNumber: filingObj.filing['edgar:fileNumber'][0],
        acceptanceDatetime: moment(filingObj.filing['edgar:acceptanceDatetime'], 'YYYYMMDDHHmm'),
        period: moment(filingObj.filing['edgar:period'], 'YYYYMMDD'),
        assistantDirector:
            filingObj.filing['edgar:assistantDirector'] && filingObj.filing['edgar:assistantDirector'][0] || null,
        assignedSic: filingObj.filing['edgar:assignedSic'] && filingObj.filing['edgar:assignedSic'][0] || null,
        fiscalYearEnd: filingObj.filing['edgar:fiscalYearEnd'] && moment(filingObj.filing['edgar:fiscalYearEnd'], 'MMDD') || null,
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

const formatRawGaapIdentifiers = (identifiers, extensionType) => {
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

const formatRawExtensions = (extensionObjs) => {
    return map(extensionObjs, extensionObj => {
        extension = extensionObj['$']

        return {
            sequence: extension['edgar:sequence'],
            file: extension['edgar:file'],
            fileType: extension['edgar:type'],
            size: extension['edgar:size'],
            description: extension['edgar:description'],
            url: extension['edgar:url'],
        }
    });
}

const parseRssItem = (filing) => {
    const cik = Number(filing.filing['edgar:cikNumber']);
    console.log({ cik });

    // Format raw extension files
    extensions = formatRawExtensions(filing.filing['edgar:xbrlFiles'][0][['edgar:xbrlFile']]);
    console.log({ extensions });

    // format raw filing data
    formattedFiling = formatRawFiling(filing)
}

const loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

const loadGaapIdentifiersFromJson = async (path, sheet, next) => {
    return require('./xlsx').parse(path, sheet, next);
}

const createByDepth = async (tree) => {
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
            leaf.parent = await gaapIdentifier.methods.findParentIdentifier(leaf);
        } else {
            await logs('[server] is top-level element', `${leaf.name}`.help);
        }

        // await logs(`[server] depth ${leaf.depth} name ${leaf.name}`);
        await gaapIdentifier.methods.create(leaf);
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

module.exports = {
    parseRssItem,
    loadCompaniesFromJson,
    loadGaapIdentifiersFromJson,
    formatRawGaapIdentifiers,
    createByDepth,
};