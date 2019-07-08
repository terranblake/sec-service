const {
    gaapIdentifiers,
    filings,
    companies,
    facts,
} = require('../models');

module.exports.getFilingsGaapIdentifierCoverage = async (ticker, filingType, threshold, startDate, endDate) => {
    if (!ticker || !filingType || !threshold || !startDate || !endDate) {
        return { message: 'missing parameters' };
    }

    const company = await companies.model.findOne({ ticker });

    // get all unique identifiers
    const uniqueGaapIdentifiers = await gaapIdentifiers.model.find({
        documentation: { $exists: true },
    }, {
            name: 1,
            _id: 1,
            documentation: 1,
        }).distinct('name');

    // find all filings by company and type
    // with a taxonomy extension
    const filingsIdentifiers = await getAllFilingsByCompanyDateAndTypeWithExtension(company, filingType, startDate, endDate);
    const companyFilings = Object.keys(filingsIdentifiers);

    let coverage = {};
    uniqueGaapIdentifiers.forEach((identifier) => {
        const percentCoverage = getPercentCoverageByGaapIdentifier(filingsIdentifiers, identifier);

        // filter out identifiers below threshold
        if (percentCoverage >= threshold) {
            coverage[identifier] = percentCoverage;
        }
    });

    return {
        company,
        coverage: {
            threshold,
            filings: {
                count: companyFilings.length,
                ids: companyFilings,
            },
            identifiers: {
                count: Object.keys(coverage).length,
                keys: coverage
            },
        },
    };
}

module.exports.getGaapIdentifierCoverage = async (ticker, filingType, startDate, endDate, identifiers) => {
    identifiers = identifiers.split(',');

    if (!ticker || !filingType || !startDate || !endDate || (Array.isArray(identifiers) && !identifiers.length)) {
        return { message: 'missing parameters' };
    }

    const company = await companies.model.findOne({ ticker });
    const filingsIdentifiers = await getAllFilingsByCompanyDateAndTypeWithExtension(company, filingType, startDate, endDate);
    const companyFilings = Object.keys(filingsIdentifiers);

    identifiers = identifiers.reduce((acc, i) => {
        acc[i] = getPercentCoverageByGaapIdentifier(filingsIdentifiers, i);
        return acc;
    }, {});

    return {
        company,
        coverage: {
            filings: {
                count: companyFilings.length,
                ids: companyFilings,
            },
            identifiers: identifiers,
        },
    };
}

function getPercentCoverageByGaapIdentifier(filingsIdentifiers, identifier) {
    const numberFound = Object.keys(filingsIdentifiers).filter(filing => filingsIdentifiers[filing].includes(identifier)).length;
    return (numberFound / Object.keys(filingsIdentifiers).length) * 100;
}

// used for finding filing that are problematic and have
// missing keys. this doesn't need to be used in production
function getGaapIdentifierCoverageByFiling(filingsIdentifiers, identifier) {
    const haveIdentifier = Object.keys(filingsIdentifiers).filter(filing => filingsIdentifiers[filing].includes(identifier));
    return {
        yes: haveIdentifier,
        no: Object.keys(filingsIdentifiers).filter(i => !haveIdentifier.includes(i)),
    };
}

async function getAllFilingsByCompanyDateAndTypeWithExtension(company, filingType, startDate, endDate) {
    let companyFilings = await filings.model.find({
        company: company._id,
        type: filingType,
        'taxonomyExtensions.0': { $exists: true },
        filingDate: { $gt: startDate, $lt: endDate },
    }).populate({ path: 'taxonomyExtensions' });
    companyFilings = companyFilings.filter(f => f.taxonomyExtensions.length > 0);

    let filingsIdentifiers = {};
    for (let filing in companyFilings) {
        filing = companyFilings[filing];

        let filingFacts = await facts.model.find({ filing }, { 'identifiers.gaapIdentifierName': 1 });
        filingFacts = filingFacts.map(f => f.identifiers.gaapIdentifierName);

        filingsIdentifiers[filing._id] = filingFacts;
    }

    return filingsIdentifiers;
}