const moment = require('moment');
const { map } = require('lodash');

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

module.exports = {
    parseRssItem,
    loadCompaniesFromJson,
};