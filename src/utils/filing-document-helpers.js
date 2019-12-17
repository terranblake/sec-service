const util = require('util');
const moment = require('moment');

const identifiers = require('../models/identifiers');

const { logs, errors, warns } = require('./logging');
const { magnitude, signum } = require('.');
const supportedUnits = require('./supported-units');

const { identifierPrefixes, factCurrencies } = require('./common-enums');
const {
    getDateType,
    getYearReported,
    getQuarterReported
} = require('./date-helpers');

module.exports.formatFacts = async (unformattedFacts, contexts, units, filing, company) => {
    let expandedFacts = [];

    for (let fact in unformattedFacts) {
        // we only want facts we can process
        if (!identifierPrefixes.find(p => fact.includes(p))) {
            errors(`no valid prefix found for fact grouping ${fact}`);
            continue;
        }

        identifierName = fact.substr(fact.indexOf(':') + 1);
        let matchedIdentifiers = await identifiers.model.find({ name: identifierName });
        matchedIdentifiers = matchedIdentifiers.map(i => i._id);

        if (!Array.isArray(matchedIdentifiers) || !matchedIdentifiers.length) {
            errors(`no identifier found for ${fact} company ${company} filing ${filing}`);
            continue;
        }

        const likeFacts = await expandAndFormatLikeFacts(unformattedFacts[fact], contexts, units, filing, company, matchedIdentifiers, identifierName);
        if (!likeFacts.length) {
            if (fact.includes('gaap')) {
                logs(`identifier with name ${identifierName} was a gaap identifier with no valid facts`);
            }
            continue;
        }

        for (let formatted of likeFacts) {
            expandedFacts.push(formatted);
        }
    }

    return expandedFacts;
}

async function expandAndFormatLikeFacts(facts, contexts, units, filing, company, identifiers, identifierName) {
    let updatedFacts = [];

    for (let fact of facts) {
        const { unitRef, contextRef, value, signum } = await normalizeFact(fact);

        const unit = await units.find(u => u.identifier === unitRef || (factCurrencies.map(c => c.toLowerCase()).includes(unitRef.toLowerCase()) || u.identifier === 'usd'));
        if (!unit) {
            errors(`missing unit for fact identifier ${identifierName} unitRef ${unitRef} filing ${filing}`);
            continue;
        }

        const context = contexts.find(c => c.label === contextRef);
        if (!context) {
            errors(`missing context for fact identifier ${identifierName} unitRef ${unitRef} filing ${filing}`);
            continue;
        }

        fact = {
            filing,
            company,
            identifier: identifiers[0],
            name: identifierName,
            date: context.date,
            itemType: unit.type,
            value,
            segment: context.segment,
            label: fact.label || fact.name,
            // todo :: Get balance for facts (debit, credit)
            // balance: context.balance,
            sign: signum === '+',
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

module.exports.formatUnits = (rawUnits) => {
    let formattedUnits = []
    for (let rawUnit of rawUnits) {
        const name = rawUnit.$.id;

        const rawCalcType = Object.keys(rawUnit).find(u => u.includes('xbrli:'));
        const type = rawCalcType && rawCalcType.split(':').length
            ? rawCalcType.split(':')[1]
            : 'measure';

        let unit = rawUnit[rawCalcType];
        let formattedUnit = {
            name,
            type,
            calculation: []
        };

        if (type === 'measure') {
            const [prefix, name] = unit[0].split(':');
            formattedUnit.calculation = [{ prefix, name }];
        } else {
            // only do this if the unit type isn't a simple measure calculation
            unit = unit[0];
            for (let item of Object.keys(unit)) {
                item = unit[item];
                const [prefix, name] = item[0]['xbrli:measure'][0].split(':');
                formattedUnit.calculation.push({ prefix, name });
            }
        }

        formattedUnits.push(formattedUnit);
    }

    return formattedUnits;
}

module.exports.formatContexts = async (extensionContexts, filing, company) => {
    let formattedContexts = [];
    for (let context of extensionContexts) {
        const entity = (context["xbrli:entity"] || context.entity)[0];
        const period = (context["xbrli:period"] || context.period)[0];

        // todo: confirm if there can be more than 1 segment defined for
        // a single context object. hard exit if so, to make it obvious
        // that something needs to be addressed
        const rawSegment = (entity["xbrli:segment"] || entity.segment);
        if (rawSegment && rawSegment.length > 1) {
            errors(`more than 1 segment found for filing ${filing._id} company ${company._id}. bailing!`);
            process.exit(1);
        }

        const date = formatContextDate(period);
        const segment = rawSegment && formatContextSegment(rawSegment[0]);

        formattedContexts.push({
            label: context['$'].id,
            filing,
            company,
            segment,
            date,
        });
    }

    return formattedContexts;
}

function formatContextDate(contextPeriod) {
    if (!contextPeriod) {
        throw new Error('context period is missing');
    }
    const rawDateType = Object.keys(contextPeriod)[0].includes('instant') ? 'instant' : 'series';
    const value = rawDateType === 'instant'
        ? new Date((contextPeriod["xbrli:instant"] || contextPeriod.instant)[0])
        : {
            startDate: new Date(contextPeriod["xbrli:startDate"][0] || contextPeriod.startDate),
            endDate: new Date(contextPeriod["xbrli:endDate"][0] || contextPeriod.endDate)
        };

    const type = getDateType(value);
    return {
        type,
        value,
        quarter: getQuarterReported(value, type),
        year: getYearReported(value, type)
    };

}

function formatContextSegment(segment = {}) {
    if (!segment['xbrldi:explicitMember']) {
        console.error(`missing explicitMember`);
        process.exit(1);
    }

    const members = segment['xbrldi:explicitMember'];
    if (!members.length) {
        return members;
    }

    let formattedSegment = [];
    for (let dimension of members) {
        const valueSplit = dimension._.split(':');
        const dimensionSplit = dimension.$.dimension.split(':');

        formattedSegment.push({
            value: {
                prefix: valueSplit[0],
                name: valueSplit[1]
            },
            dimension: {
                prefix: dimensionSplit[0],
                name: dimensionSplit[1]
            }
        })
    }

    return formattedSegment;
}