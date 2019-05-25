const { gaapIdentifiers, facts, contexts } = require('../models');
const { identifierPrefixes, factCurrencies } = require('../utils/common-enums');
const { logs, errors, warns } = require('./logging');
const { signum, magnitude } = require('../utils/raw-data-helpers');

module.exports.formatFacts = async (unformattedFacts, extensionType, filing, company) => {
    let expandedFacts = [];

    for (let fact in unformattedFacts) {
        // we only want facts we can process
        if (identifierPrefixes.find(p => fact.includes(p))) {
            // console.log({ fact, unformatted: unformattedFacts[fact] });
            gaapIdentifierName = fact.substr(fact.indexOf(':') + 1);
            let identifiers = await gaapIdentifiers.model.find({ name: gaapIdentifierName });
            identifiers = identifiers.map(i => i._id);

            // we only want facts we have a matching identifier for
            if (Array.isArray(identifiers) && identifiers.length) {
                // console.log({ facts: unformattedFacts[fact], identifiers, fact });
                const likeFacts = await expandAndFormatLikeFacts(unformattedFacts[fact], extensionType, filing, company, identifiers, gaapIdentifierName);
                likeFacts && likeFacts.forEach((formatted) => {
                    expandedFacts.push(formatted);
                });
            } else {
                logs(`no identifier found for ${fact} company ${company} filing ${filing}`);
            }
        }
    }

    return expandedFacts;
}

async function expandAndFormatLikeFacts(facts, extensionType, filing, company, gaapIdentifiers, gaapIdentifierName) {
    let updatedFacts = [];
    for (let i in facts) {
        let fact = facts[i];
        // console.log('fact', fact);
        fact = normalizeFact(fact);

        // const query = { filing, company, label: contextRef };
        // const res = await contexts.model.findOne(query);
        // if (res) {
        //     fact = {
        //         company,
        //         filing,
        //         extensionType,
        //         identifiers: {
        //             gaapIdentifierName,
        //             gaapIdentifiers,
        //         },
        //         value,
        //         context: res._id,
        //     };
        //     updatedFacts.push(fact);
        // } else {

        // }
    };

    return updatedFacts;
}

function normalizeFact(fact) {
    const {
        contextRef,
        unitRef,
        decimals,
    } = fact['$'];
    let value = fact['_'];

    // console.log('fact', fact);

    // Determine the type of fact that this is
    //  e.g. date, monetary, weight, energy, etc.

    // handler for each type of unit supported (currently only monetaryItemType)
    //  move the existing numerical handler into separate function

    if (!factCurrencies.includes(unitRef)) {
        errors(`normalizing ${unitRef} is not supported filing ${filing}`);
        console.log('excluded', { fact });
        return value;
    }

    // convert decimal to signum
    // decimalsToSignum(decimals)

    // get magnitude from decimals and signum
    // magnitude(decimals, signum)


}

module.exports.formatUnits = (filing, company, extensionContents) => {
    /*

<unit id="iso4217_USD_per_Right">
    <divide>
        <unitNumerator>
            <measure>iso4217:USD</measure>
        </unitNumerator>
        <unitDenominator>
            <measure>crm:Right</measure>
        </unitDenominator>
    </divide>
</unit>

<unit id="acre">
    <measure>utr:acre</measure>
</unit>

<unit id="iso4217_USD">
    <measure>iso4217:USD</measure>
</unit>

<unit id="M">
    <measure>utr:M</measure>
</unit>

*/
}

module.exports.formatContexts = (filing, company, extensionContents) => {
    const contexts = extensionContents['xbrli:context'];

    let formattedContexts = [];
    for (let context in contexts) {
        context = contexts[context];
        const members = getContextMembers(filing, company, context["xbrli:entity"][0]["xbrli:segment"]);
        let period = getContextPeriod(context["xbrli:period"][0]);

        formattedContexts.push({
            label: context['$'].id,
            filing,
            company,
            members,
            period,
        });
    }

    return formattedContexts;
}

function getContextPeriod(contextPeriod) {
    if (contextPeriod) {
        const dateType =
            Object.keys(contextPeriod)[0].includes('instant') ?
                'instant' :
                'duration';

        return {
            dateType,
            [dateType]:
                dateType === 'instant' ?
                    contextPeriod["xbrli:instant"][0] :
                    {
                        startDate: new Date(contextPeriod["xbrli:startDate"]),
                        endDate: new Date(contextPeriod["xbrli:endDate"])
                    }
        };
    }
}

function getContextMembers(filing, company, members) {
    if (members && members[0]) {
        members = members[0];

        if (members["xbrldi:explicitMember"]) {
            newMembers = [];
            members["xbrldi:explicitMember"].forEach((member) => {
                newMembers.push({ value: member["_"], gaapDimension: member['$'].dimension });
            });

            return newMembers;
        } else {
            warns(`explicit member key does not exist for this context company ${company} filing ${filing}`);
        }
    }
}

function formatUnits(filing, company, extensionContents) {

}