const {
    gaapIdentifiers,
    filings,
    companies,
    facts,
} = require('../models');
const { logs, errors } = require('./logging');

module.exports.getFilingsGaapIdentifierCoverage = async (company, filingType) => {
    const uniqueGaapIdentifiers = await gaapIdentifiers.model.find({}, { name: 1, _id: 1 }).distinct('name');
    let companyFilings = await filings.model.find({ company, type: filingType }).populate({ path: 'taxonomyExtensions' });
    companyFilings = companyFilings.filter(f => f.taxonomyExtensions.length > 0);
    
    let filingsIdentifiers = {};
    for (let filing in companyFilings) {
        filing = companyFilings[filing];

        let filingFacts = await facts.model.find({ filing }, { 'identifiers.gaapIdentifierName': 1 });
        filingFacts = filingFacts.map(f => f.identifiers.gaapIdentifierName);

        filingsIdentifiers[filing._id] = filingFacts;
    }

    return await uniqueGaapIdentifiers.map(async (identifier) => {
        const numberFound = Object.keys(filingsIdentifiers).filter(filing => filingsIdentifiers[filing].includes(identifier)).length;
        // console.log({ numberFound });
        const result = { [identifier]: (numberFound / companyFilings.length) * 100 };
        if (numberFound !== 0) {
            console.log(numberFound / Object.keys(filingsIdentifiers).length, identifier, result[identifier]);
        }

        return result;
    })
}