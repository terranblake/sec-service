const { gaapIdentifiers, facts, contexts } = require('../models');
const { identifierPrefixes } = require('../utils/common-enums');

module.exports.formatFacts = async (unformattedFacts, extensionType, filing, company) => {
    let expandedFacts = [];

    for (let fact in unformattedFacts) {
        // we only want facts we can process
        if (identifierPrefixes.find(p => fact.includes(p))) {
            noPrefixFact = fact.substr(fact.indexOf(':') + 1);
            let identifiers = await gaapIdentifiers.model.find({ name: noPrefixFact });
            identifiers = identifiers.map(i => i._id);

            // we only want facts we have a matching identifier for
            if (Array.isArray(identifiers) && identifiers.length) {
                // console.log({ facts: unformattedFacts[fact], identifiers, fact });
                const likeFacts = await expandAndFormatLikeFacts(unformattedFacts[fact], extensionType, filing, company, identifiers);
                likeFacts && likeFacts.forEach((formatted) => {
                    expandedFacts.push(formatted);
                });
            } else {
                console.info(`no identifier found for ${fact} company ${company} filing ${filing}`);
            }
        }
    }

    return expandedFacts;
}

async function expandAndFormatLikeFacts(facts, extensionType, filing, company, gaapIdentifiers) {
    for (let i in facts) {
        fact = facts[i];

        const {
            contextRef,
            unitRef,
            decimals,
        } = fact['$'];

        let value = fact['_'];
        value = value && normalizeValueWithDecimals(value, decimals, unitRef);

        const query = { filing, company, label: contextRef };
        const res = await contexts.model.findOne(query);
        if (res) {
            fact = {
                company,
                filing,
                extensionType,
                gaapIdentifiers,
                value,
                context: res._id,
            }
            facts[i] = fact;
        }
    };

    return facts;
}

function normalizeValueWithDecimals(value, decimals, unitRef) {
    if (['USD'].includes(unitRef)) {
        console.error(`normalizing ${unitRef} is not supported`);
        return value;
    }

    let sign = decimals && decimals !== 0 && decimals.slice(0, 1);
    sign = sign === '-' ? '-' : decimals !== 0 ? '+' : '-';

    if (decimals && !['+', '-'].includes(sign)) {
        console.error(`cannot normalize[${value}] without +/- sign[${sign}] in decimals[${decimals}]`);
        return value;
    }

    places = decimals.slice(1);
    scalar =
        sign === '-' ?
            // postive scalar
            Math.pow(10, Number(places)) :
            // stripped decimals isn't 0
            places !== '' ?
                // negative scalar
                Math.pow(10, Number(-1 * places)) :
                // neutral
                1;

    return Number(value) * scalar;
}

module.exports.formatContexts = (filing, company, extensionContents) => {
    const contexts = extensionContents['xbrli:context'];

    let formattedContexts = [];
    for (let context in contexts) {
        context = contexts[context];
        const members = getContextMembers(context["xbrli:entity"][0]["xbrli:segment"]);
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

function getContextMembers(members) {
    if (members) {
        newMembers = [];
        members[0]["xbrldi:explicitMember"].forEach((member) => {
            newMembers.push({ value: member["_"], gaapDimension: member['$'].dimension });
        });

        return newMembers;
    }
}