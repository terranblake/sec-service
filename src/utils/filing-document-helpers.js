const identifiers = require('../models/identifiers');
const { identifierPrefixes, factCurrencies } = require('./common-enums');
const { logs, errors, warns } = require('./logging');
const { magnitude, signum } = require('.');
const supportedUnits = require('./supported-units');
const util = require('util');

module.exports.formatFacts = async (unformattedFacts, contexts, units, filing, company) => {
    let expandedFacts = [];
    
    for (let fact in unformattedFacts) {
        // we only want facts we can process
        if (identifierPrefixes.find(p => fact.includes(p))) {
            // console.log({ fact, unformatted: unformattedFacts[fact] });
            identifierName = fact.substr(fact.indexOf(':') + 1);
            let matchedIdentifiers = await identifiers.model.find({ name: identifierName });
            matchedIdentifiers = matchedIdentifiers.map(i => i._id);

            // we only want facts we have a matching identifier for
            if (Array.isArray(matchedIdentifiers) && matchedIdentifiers.length) {

                const likeFacts = await expandAndFormatLikeFacts(unformattedFacts[fact], contexts, units, filing, company, matchedIdentifiers, identifierName);
                likeFacts && likeFacts.forEach((formatted) => {
                    expandedFacts.push(formatted);
                });
            } else {
                warns(`no identifier found for ${fact} company ${company} filing ${filing}`);
            }
        } else {
            warns(`no valid prefix found for fact grouping ${fact}`);
        }
    }

    return expandedFacts;
}

async function expandAndFormatLikeFacts(facts, contexts, units, filing, company, identifiers, identifierName) {
    let updatedFacts = [];
    
    for (let fact of facts) {
        const { unitRef } = await normalizeFact(fact);
        unit = await units.find(u => u.identifier === unitRef);
        if (!unit) {
            warns(`missing unit for fact identifier ${identifierName} filing ${filing}`);
            continue;
        }

        const context = contexts.find(c =>
            c.company === company.toString()
            && c.label === contextRef
        );
        
        if (!context) {
            continue;
        }

        fact = {
            filing,
            company,
            identifier: identifiers[0],
            name: identifierName,
            date: context.date,
            itemType: unit.type,
            value: fact.value,
            label: fact.label || fact.name,
            // TODO :: Get balance for facts (debit, credit)
            // balance: context.balance,
            sign: unit.signum === '+',
        };

        if (!fact.filing) {
            errors(`missing fields for fact identifier ${identifierName} filing ${filing}`);
        }

        logs(`formatted fact unit ${unit && unit.identifier} identifier ${identifierName} context ${context && context.label} filing ${filing}`);
        updatedFacts.push(fact);
    };

    return updatedFacts;
}

function normalizeFact(fact) {
    const {
        decimals,
        contextRef,
        unitRef
    } = fact['$'];

    const factSignum = signum(decimals);
    value =
        decimals &&
        magnitude(fact['_'], decimals, factSignum) ||
        fact['_'];

    return {
        value,
        contextRef,
        unitRef: unitRef && unitRef.replace('iso4217_', '').toLowerCase(),
        decimals,
        signum: factSignum,
    }
}

module.exports.formatUnits = async (extensionUnits, filing, company) => {
    let formattedUnits = []
    for (let unit in extensionUnits) {
        unit = extensionUnits[unit];
        id = unit.$.id;

        other = unit['xbrli:measure'] ||
            unit.measure ||
            unit.divide;
        other = other && other[0];

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

        const unitIdentifiers = supportedUnits.map(s => s.identifier);

        // TODO :: Handle this more elegantly. it doesn't account for other iso variants
        //          and only returns a single value
        unitId = unit['$'].id.replace('iso4217_', '').toLowerCase();
        const foundUnit = supportedUnits.find(u => u.identifier === unitId);
        if (foundUnit || factCurrencies.includes(other)) {
            logs(`found unit with matching identifier ${unitId}`);
            formattedUnits.push(foundUnit);
        } else {
            warns(`skipping unsupported unit ${unitId} filing ${filing} company ${company.name}`);
        }
    }

    return formattedUnits.filter(u => u && u.identifier);
}

module.exports.formatContexts = async (extensionContexts, filing, company) => {
    let formattedContexts = [];
    for (let context of extensionContexts) {
        let entity = (context["xbrli:entity"] || context.entity)[0];
        let segments = (entity["xbrli:segment"] || entity.segment);
        if (segments && segments.length) {
            continue;
        }

        members = getContextMembers(filing, company, segments);

        const period = (context["xbrli:period"] || context.period)[0];
        let date = getContextDate(period);

        formattedContexts.push({
            label: context['$'].id,
            filing,
            company,
            members,
            date,
        });
    }

    return formattedContexts;
}

function getContextDate(contextPeriod) {
    if (contextPeriod) {
        const dateType = Object.keys(contextPeriod)[0].includes('instant') ? 'instant' : 'series';

        return {
            type: dateType,
            value:
                dateType === 'instant'
                    ? new Date((contextPeriod["xbrli:instant"] || contextPeriod.instant)[0])
                    : {
                        startDate: new Date(contextPeriod["xbrli:startDate"] || contextPeriod.startDate),
                        endDate: new Date(contextPeriod["xbrli:endDate"] || contextPeriod.endDate)
                    }
        };
    }
}

function getContextMembers(filing, company, members = []) {
    if (!members.length) {
        return members;
    }

    members = members[0];

    if (!members["xbrldi:explicitMember"] && !members['_'] && !members.explicitMember) {
        console.log('invalid members', util.inspect({ members }));
        warns(`explicit member key does not exist for this context company ${company} filing ${filing}`);
    }

    newMembers = [];
    members = members["xbrldi:explicitMember"] || members.explicitMember || members;

    if (Array.isArray(members)) {
        members.forEach((member) => {
            newMembers.push({ value: member["_"], gaapDimension: member['$'].dimension });
        });
    } else {
        newMembers.push({ value: members["_"], gaapDimension: members['$'].dimension });
    }

    return newMembers;
}