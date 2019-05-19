const moment = require('moment');
const { map, reduce } = require('lodash');
const util = require('util');

const { parseString } = require('xml2js');
const request = require("request");

const { formatContexts, formatFacts } = require('./taxonomy-extension-helpers');

const { gaapIdentifiers, companies, filings, taxonomyExtensions, contexts, facts } = require('../models');
const { taxonomyExtensionTypes } = require('../utils/common-enums');
const { logs, errors } = require('../utils/logging');

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
                status: 'unprocessed',
            };

            const { _id } = await taxonomyExtensions.create(extension);
            filtered.push(_id);
        }
        return filtered;
    }, []);

    logs(`aggregated ${createdExtensions.length} extensions for company ${company.name} cik ${company.cik}`);
    return createdExtensions;
}

module.exports.createFilingFromRssItem = async (rawRssItem) => {
    const cik = Number(rawRssItem.filing['edgar:cikNumber']);
    const accessionNumber = rawRssItem.filing['edgar:accessionNumber'][0];

    const foundCompany = await companies.findByCik(cik);
    if (foundCompany) {
        const foundFiling = await filings.get({
            company: foundCompany && foundCompany._id || null,
            accessionNumber
        });

        if (Array.isArray(foundFiling) && foundFiling.length) {
            logs(`duplicate filing company ${foundCompany.name} cik ${cik} accessionNumber ${accessionNumber}`);
            return;
        }

        // Format raw extension files
        let extensions = rawRssItem.filing['edgar:xbrlFiles'][0][['edgar:xbrlFile']];
        extensions = await aggregateTaxonomyExtensions(foundCompany, extensions);

        // format raw filing data and append
        //  taxonomy extensions to object
        let filing = formatRawFiling(rawRssItem, extensions, foundCompany._id);
        const newFiling = await filings.create(filing);
        if (!newFiling) {
            errors(`unable to process filing company ${foundCompany.name} cik ${cik} accessionNumber ${accessionNumber}`)
            return false;
        }

        return newFiling._id;
    } else {
        errors(`company could not be found cik ${cik}`);
    }

    return false;
}

module.exports.scrapeFilingFromSec = async (rssItem) => {
    /*
     'accession-nunber': [ '0000320193-18-000145' ],
     'file-number': [ '001-36743' ],
     'file-number-href': [ 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=001-36743&owner=exclude&count=100' ],
     'filing-date': [ '2018-11-05' ],
     'filing-href': [ 'https://www.sec.gov/Archives/edgar/data/320193/000032019318000145/0000320193-18-000145-index.htm' ],
     'filing-type': [ '10-K' ],
     'film-number': [ '181158788' ],
     'form-name': [ 'Annual report [Section 13 and 15(d), not S-K Item 405]' ],
     size: [ '12 MB' ],
     xbrl_href: [ 'https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-18-000145&xbrl_type=v' ] }
    */
    const xpath = require('xpath');
    const parse5 = require('parse5');
    const xmlser = require('xmlserializer');
    const dom = require('xmldom').DOMParser;

    const filingHref = rssItem.link;
    const filing = await this.download(filingHref, {}, false);
    const document = parse5.parse(filing.toString());
    const xhtml = xmlser.serializeToString(document);
    const doc = new dom().parseFromString(xhtml);

    // "//*[@scope=\"row\"]/*"          get all extension documents
    // "//*[@class=\"tableFile\"]"      get all extension documents with metadata
    // "//*[@class=\"info\"]"           get filing date, acceptanceDateTime and report period
    // "//*[@class=\"mailer\"]"         business address/info
    // "//*[@class=\"companyInfo\"]"    other company info
    const result = xpath.evaluate(
        "//*[@class=\"identInfo\"]",            // xpathExpression
        doc,                        // contextNode
        null,                       // namespaceResolver
        xpath.XPathResult.ANY_TYPE, // resultType
        null                        // result
    );

    node = result.iterateNext();
    while (node) {
        console.log(node.localName + ": " + node && node.firstChild && node.firstChild.data);
        console.log("Node: " + node.toString());

        const newDoc = new dom().parseFromString(node.toString());
        // console.log(xpath.select('/div', newDoc));

        node = result.iterateNext();
    }

    // const select = xpath.useNamespaces({ "x": "http://www.w3.org/1999/xhtml" });
    // const nodes = select("//x:*[@class=\"formGrouping\"]", doc);
    // console.log(nodes);
}

module.exports.loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

module.exports.loadGaapIdentifiersFromJson = async (path, sheet, next) => {
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
    // this probably won't work for everything
    elements = elements["xbrli:xbrl"] || elements.xbrl;

    // don't support other types until
    //  instance parsing is stable
    if (type === 'instance') {
        let newContexts = formatContexts(filingId, companyId, elements);
        newContexts = await contexts.createAll(newContexts);

        let newFacts = await formatFacts(elements, type, filingId, companyId);
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