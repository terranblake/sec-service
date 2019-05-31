const { gaapIdentifiers, facts, contexts, units } = require('../models');
const { identifierPrefixes, factCurrencies, unitTypes } = require('../utils/common-enums');
const { logs, errors, warns } = require('./logging');
const { magnitude, signum } = require('../utils');
const util = require('util');

module.exports.formatFacts = async (unformattedFacts, units, extensionType, filing, company) => {
    let expandedFacts = [];

    for (let fact in unformattedFacts) {
        // we only want facts we can process
        if (identifierPrefixes.find(p => fact.includes(p))) {
            // console.log({ fact, unformatted: unformattedFacts[fact] });
            gaapIdentifierName = fact.substr(fact.indexOf(':') + 1);
            let identifiers = await gaapIdentifiers.model.find({ name: gaapIdentifierName });
            identifiers = identifiers.map(i => i._id);
            console.log(identifiers, Array.isArray(identifiers));

            // we only want facts we have a matching identifier for
            if (Array.isArray(identifiers) && identifiers.length) {
                // console.log({ facts: unformattedFacts[fact], identifiers, fact });
                const likeFacts = await expandAndFormatLikeFacts(unformattedFacts[fact], units, extensionType, filing, company, identifiers, gaapIdentifierName);
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

async function expandAndFormatLikeFacts(facts, units, extensionType, filing, company, gaapIdentifiers, gaapIdentifierName) {
    let updatedFacts = [];
    for (let i in facts) {
        let fact = facts[i];
        fact = normalizeFact(fact, filing, company);
        unit = units.find(u => u.identifier === fact.unitRef);

        // TODO :: This filter is not enough to guarantee
        //          a unique context per filing. This should
        //          use the filing id for specificity
        const query = { company, label: fact.contextRef };
        const res = await contexts.model.findOne(query);
        if (unit) {
            fact = {
                company,
                filing,
                extensionType,
                identifiers: {
                    gaapIdentifierName,
                    gaapIdentifiers,
                },
                value: fact.value,
                context: res && res._id,
                unit: unit._id
            };
            logs(`formatted fact unit ${unit.identifier} gaapIdentifier ${fact.identifiers.gaapIdentifierName} context ${res.label}`);
            updatedFacts.push(fact);
        } else {
            warns(`unable to format fact unit ${unit && unit.identifier} gaapIdentifier ${fact.identifiers && fact.identifiers.gaapIdentifierName} context ${res && res.label}`);
            console.log(fact);
        }
    };

    return updatedFacts;
}

function normalizeFact(fact, filing, company) {
    const {
        decimals,
        contextRef,
        unitRef
    } = fact['$'];
    
    value =
        decimals &&
        magnitude(fact['_'], decimals, signum(decimals)) ||
        fact['_'];

    return {
        value,
        contextRef,
        unitRef: unitRef && unitRef.replace('iso4217_', '').toLowerCase(),
        decimals,
    }
}

module.exports.formatUnits = async (extensionUnits, filing, company) => {
    let supportedUnits = await units.model.find({ type: { $in: unitTypes } });
    let formattedUnits = []
    for (let unit in extensionUnits) {
        unit = extensionUnits[unit];
        id = unit.$.id;
        other = (unit.measure || unit.divide)[0];

        const otherType = typeof other;
        if (otherType === 'object') {
            // TODO :: Properly handle pure(percentage) units

            // TODO :: Properly process units which have a numerator and denominator
            // This is likely a numerator/denomiator unit with additional calculation
            // Skipping until this data is relevant and can be used

            warns(`skipping calculation step unit ${id} filing ${filing} company ${company}`);
            continue;
        } else if (otherType !== 'string') {
            warns(`invalid other type [${otherType}] for unit ${id} filing ${filing} company ${company}`);
            continue;
        }

        // TODO :: Handle this more elegantly. it doesn't account for other iso variants
        //          and only returns a single value
        unitId = unit['$'].id.replace('iso4217_', '').toLowerCase();
        if (supportedUnits.map(s => s.identifier).includes(unitId) || factCurrencies.includes(unitId)) {
            logs(`found unit with matching identifier ${unitId}`);
            formattedUnits.push(supportedUnits.find(s => s.identifier === unitId));
        } else {
            warns(`skipping unsupported unit ${unitId} filing ${filing} company ${company}`);
        }
    }

    return formattedUnits;
}

module.exports.formatContexts = (extensionContexts, filing, company) => {
    let formattedContexts = [];
    for (let context in extensionContexts) {
        context = extensionContexts[context];

        let entity = (context["xbrli:entity"] || context.entity)[0];
        let segment = (entity["xbrli:segment"] || entity.segment);

        members = getContextMembers(filing, company, segment);

        let period = (context["xbrli:period"] || context.period)[0]
        period = getContextPeriod(period);

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
                    (contextPeriod["xbrli:instant"] || contextPeriod.instant)[0] :
                    {
                        startDate: new Date(contextPeriod["xbrli:startDate"] || contextPeriod.startDate),
                        endDate: new Date(contextPeriod["xbrli:endDate"] || contextPeriod.endDate)
                    }
        };
    }
}

function getContextMembers(filing, company, members) {
    if (members && members[0]) {
        members = members[0];

        if (members["xbrldi:explicitMember"] || members['_']) {
            newMembers = [];
            members = members["xbrldi:explicitMember"] || members;

            if (Array.isArray(members)) {
                members.forEach((member) => {
                    newMembers.push({ value: member["_"], gaapDimension: member['$'].dimension });
                });
            } else {
                newMembers.push({ value: members["_"], gaapDimension: members['$'].dimension });
            }

            return newMembers;
        } else {
            console.log('invalid members', { members });
            warns(`explicit member key does not exist for this context company ${company} filing ${filing}`);
        }
    }
}