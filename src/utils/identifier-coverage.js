const { Identifier, Filing, Company, Fact } = require('@postilion/models');

module.exports.getFilingsIdentifierCoverage = async (ticker, filingType, threshold, startDate, endDate) => {
    if (!ticker || !filingType || !threshold || !startDate || !endDate) {
        return { message: 'missing parameters' };
    }

    const company = await Company.findOne({ ticker });

    // get all unique identifiers
    const uniqueIdentifiers = await Identifier.find({
        documentation: { $exists: true },
    }, {
        name: 1,
        _id: 1,
        documentation: 1,
    }).distinct('name');

    // find all filings by company and type
    // with a taxonomy extension
    const filingsIdentifiers = await getAllFactsByFilingForCompanyByTypeAndDate(company, filingType, startDate, endDate);
    const companyFilings = Object.keys(filingsIdentifiers);

    let coverage = {};
    uniqueIdentifiers.forEach((identifier) => {
        const percentCoverage = getPercentCoverageByIdentifier(filingsIdentifiers, identifier);

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

module.exports.getCoverageByCompanyAndIdentifier = async ({ filingType, startDate, endDate, identifiers, slim, threshold }) => {
    if (identifiers === 'all') {
        identifiers = await Identifier.find({}, { name: 1 }).distinct('name');
    } else {
        identifiers = Array.isArray(identifiers)
            ? identifiers
            : identifiers.split(',');
    }

    if (!filingType || (Array.isArray(identifiers) && !identifiers.length)) {
        return { message: 'missing parameters' };
    }

    const allCompanies = await Company.find({});
    const aggregateResults = {};
    let filingIds = [];

    let perIdentifiers;
    for (let company of allCompanies) {
        perIdentifiers = identifiers;
        const filingsIdentifiers = await getAllFactsByFilingForCompanyByTypeAndDate(company, filingType, startDate, endDate);
        const companyFilings = Object.keys(filingsIdentifiers);

        // filter out companies without filings
        // with the corresponding filters
        if (!companyFilings.length) {
            continue;
        }

        filingIds = [...filingIds, ...companyFilings];
        Array.isArray(perIdentifiers) && perIdentifiers.reduce((acc, i) => {
            let identifierCoverage = getIdentifierCoverageByFiling(filingsIdentifiers, i);
            acc[i] = identifierCoverage;

            if (!aggregateResults[i]) {
                aggregateResults[i] = { value: 0, total: 0 };
            }

            aggregateResults[i] = {
                value: aggregateResults[i].value
                    + identifierCoverage.yes.length,
                total: aggregateResults[i].total
                    + identifierCoverage.yes.length
                    + identifierCoverage.no.length
            };
            return acc;
        }, {});

        let percentCoverage;
        for (let identifier of perIdentifiers) {
            let value = aggregateResults[identifier].value;
            let total = aggregateResults[identifier].total;

            percentCoverage = (value / total) * 100.0;
            aggregateResults[identifier].percent = percentCoverage;
        }
    }

    let identifierGrouping = {};
    for (let name of Object.keys(aggregateResults)) {
        const percent = aggregateResults[name].percent;
        const aboveThreshold = Number(percent) >= Number(threshold);

        if (!aboveThreshold) {
            continue;
        }

        const [first] = await Identifier.find({ name });
        if (identifierGrouping[first.role.name]) {
            if (aboveThreshold) {
                identifierGrouping[first.role.name].push(name)
            }
        } else {
            if (aboveThreshold) {
                identifierGrouping[first.role.name] = [name];
            }
        }
    }

    return {
        identifierGrouping,
        coverage: slim
            ? Object.keys(aggregateResults).reduce((acc, val) => {
                let percent = aggregateResults[val].percent;

                if (Number(percent) >= Number(threshold)) {
                    acc[val] = percent;
                }

                return acc;
            }, {})
            : {
                identifiers,
                companies: allCompanies,
                filings: filingIds,
                aggregateResults,
            }
    };
}

module.exports.getCoverageByIdentifier = async ({ ticker, filingType, startDate, endDate, identifiers }) => {
    identifiers = identifiers.split(',');

    if (!ticker || !filingType || !startDate || !endDate || (Array.isArray(identifiers) && !identifiers.length)) {
        return { message: 'missing parameters' };
    }

    const company = await Company.findOne({ ticker });
    const filingsIdentifiers = await getAllFactsByFilingForCompanyByTypeAndDate(company, filingType, startDate, endDate);
    const companyFilings = Object.keys(filingsIdentifiers);

    identifiers = identifiers.reduce((acc, i) => {
        acc[i] = getPercentCoverageByIdentifier(filingsIdentifiers, i);
        return acc;
    }, {});

    return {
        coverage: {
            company,
            filings: {
                count: companyFilings.length,
                ids: companyFilings,
            },
            identifiers: identifiers,
        },
    };
}

function getPercentCoverageByIdentifier(filingsIdentifiers, identifier) {
    const numberFound = Object.keys(filingsIdentifiers).filter(filing => filingsIdentifiers[filing].includes(identifier)).length;
    return (numberFound / Object.keys(filingsIdentifiers).length) * 100;
}

// used for finding filing that are problematic and have
// missing keys. this doesn't need to be used in production
function getIdentifierCoverageByFiling(filingsIdentifiers, identifier) {
    const haveIdentifier = Object.keys(filingsIdentifiers).filter(filing => filingsIdentifiers[filing].includes(identifier));
    return {
        yes: haveIdentifier,
        no: Object.keys(filingsIdentifiers).filter(i => !haveIdentifier.includes(i)),
    };
}

async function getAllFactsByFilingForCompanyByTypeAndDate(company, filingType, start, end) {
    let companyFilings = await Filing.find({
        company: company._id.toString(),
        type: filingType,
        publishedAt: {
            $gt: start,
            $lt: end
        }
    });

    let filingsIdentifiers = {};
    for (let filing in companyFilings) {
        filing = companyFilings[filing];

        let filingFacts = await Fact.find({ filing }, { 'name': 1 });
        filingFacts = filingFacts.map(f => f.name);

        filingsIdentifiers[filing._id] = filingFacts;
    }

    return filingsIdentifiers;
}