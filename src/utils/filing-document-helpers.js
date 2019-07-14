const { gaapIdentifiers, facts } = require('../models');
const { identifierPrefixes, factCurrencies, unitTypes } = require('./common-enums');
const { logs, errors, warns } = require('./logging');
const { magnitude, signum } = require('.');
const supportedUnits = require('./supportedUnits');
const util = require('util');

module.exports.formatFacts = async (unformattedFacts, contexts, units, filing, company) => {
    let expandedFacts = [];
    
    for (let fact in unformattedFacts) {
        // we only want facts we can process
        if (identifierPrefixes.find(p => fact.includes(p))) {
            // console.log({ fact, unformatted: unformattedFacts[fact] });
            identifierName = fact.substr(fact.indexOf(':') + 1);
            let identifiers = await gaapIdentifiers.model.find({ name: identifierName });
            identifiers = identifiers.map(i => i._id);

            // we only want facts we have a matching identifier for
            if (Array.isArray(identifiers) && identifiers.length) {

                const likeFacts = await expandAndFormatLikeFacts(unformattedFacts[fact], contexts, units, filing, company, identifiers, identifierName);
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
    
    for (let i in facts) {
        let fact = facts[i], unit;
        fact = await normalizeFact(fact);
        unit = await units.find(u => u.identifier === fact.unitRef);
        const context = contexts.find(c =>
            c.company === company
            && c.label === fact.contextRef
        );

        fact = {
            filing,
            company,
            identifier: identifiers[0],
            name: identifierName,
            date: context.date,
            itemType: unit.type,
            value: fact.value,
            // TODO :: Get balance for facts (debit, credit)
            // balance: context.balance,
            sign: unit.signum === '+',
        };

        if (!fact.filing) {
            errors(`missing fields for fact identifier ${identifierName} filing ${filing}`);
        }

        logs(`formatted fact unit ${unit && unit.identifier} identifier ${identifierName} context ${res && res.label} filing ${filing}`);
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

    const signum = signum(decimals);
    value =
        decimals &&
        magnitude(fact['_'], decimals, signum) ||
        fact['_'];

    return {
        value,
        contextRef,
        unitRef: unitRef && unitRef.replace('iso4217_', '').toLowerCase(),
        decimals,
        signum,
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
        if (unitIdentifiers.includes(unitId) || factCurrencies.includes(other)) {
            logs(`found unit with matching identifier ${unitId}`);
            formattedUnits.push(supportedUnits.find(s => s.identifier === unitId));
        } else {
            warns(`skipping unsupported unit ${unitId} filing ${filing} company ${company}`);
        }
    }

    return formattedUnits.filter(u => u);
}

module.exports.formatContexts = async (extensionContexts, filing, company) => {
    let formattedContexts = [];
    for (let context in extensionContexts) {
        context = extensionContexts[context];

        let entity = (context["xbrli:entity"] || context.entity)[0];
        let segment = (entity["xbrli:segment"] || entity.segment);

        members = getContextMembers(filing, company, segment);

        const period = (context["xbrli:period"] || context.period)[0]
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
        const dateType =
            Object.keys(contextPeriod)[0].includes('instant')
                ? 'cross-sectional'
                : 'time-series';

        return {
            type: dateType,
            value:
                dateType === 'instant'
                    ? (contextPeriod["xbrli:instant"] || contextPeriod.instant)[0]
                    : {
                        startDate: new Date(contextPeriod["xbrli:startDate"] || contextPeriod.startDate),
                        endDate: new Date(contextPeriod["xbrli:endDate"] || contextPeriod.endDate)
                    }
        };
    }
}

function getContextMembers(filing, company, members) {
    if (members && members[0]) {
        members = members[0];

        if (members["xbrldi:explicitMember"] || members['_'] || members.explicitMember) {
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
        } else {
            console.log('invalid members', util.inspect({ members }));
            warns(`explicit member key does not exist for this context company ${company} filing ${filing}`);
        }
    }
}