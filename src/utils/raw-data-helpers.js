const moment = require('moment');
const { reduce } = require('lodash');
const request = require("request");
const { parseString } = require('xml2js');
const { promisify } = require('util');

const { Company, Filing } = require('@postilion/models');
const { enums, logger, metadata } = require('@postilion/utils');
const { filingDocumentTypes } = enums;

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

module.exports.formatFilingDocuments = async (filingsDocuments, company, filing) =>
    reduce(filingsDocuments, (acc, document) => {
        const description =
            document.description ||
            document['$'] &&
            document['$']['edgar:description'] ||
            false;

        const documentType = description && filingDocumentTypes.find(type => new RegExp(type).test(description.toLowerCase()));
        if (!documentType) {
            logger.error(`invalid document type from description ${description} filing ${filing}`);
            return acc;
        }

        acc.push({
            filing,
            company,
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

    let foundCompany = await Company.find({ refId: cik });
    if (!foundCompany) {
        foundCompany = await metadata(Company, cik);
        logger.error('skipping filing processing until ticker to cik conversion is stable');
        return false;
    }

    const foundFiling = await Filing.find({ company: foundCompany._id, accessionNumber });
    if (Array.isArray(foundFiling) && foundFiling.length) {
        logger.error(`duplicate filing company ${foundCompany.ticker} cik ${cik} accessionNumber ${accessionNumber}. bailing!`);
        return false;
    }

    let filing = this.formatFilingBySource[source](rawRssItem, foundCompany._id);
    return filing;
}

module.exports.parseXmlString = promisify(parseString);

module.exports.loadCompaniesFromJson = async (path, next) => {
    require('fs').readFile(path, (err, res) => next(JSON.parse(res)));
}

module.exports.download = (extensionLink, progress = 1 /* log every 1 mb */) => {
    logger.info({ message: `downloading file from ${extensionLink}` });

    return new Promise((resolve, reject) => {
        let data = "";

        request
            .get(extensionLink)
            .on('response', (response) => {
                let cur = 0;

                logger.info(`\tdownloading ${extensionLink}`);
                response.on('data', (chunk) => {
                    data += chunk;
                    cur += chunk.length;

                    const megaBytes = (cur / 1048576).toFixed(2);

                    if (progress && megaBytes % progress === 0) {
                        logger.info({ message: `Downloaded ${megaBytes}mb` });
                    }
                });

                response.on('end', () => {
                    logger.info(`\tdownloaded ${extensionLink}`);
                    return resolve(data);
                });
            })
            .on('error', (err) => reject(err));
    });
}

module.exports.saveExtension = (type, data) => require('fs').writeFileSync(`./data/test/${type}.json`, JSON.stringify(data));

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