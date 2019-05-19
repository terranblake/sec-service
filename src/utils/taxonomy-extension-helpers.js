const { gaapIdentifiers, facts, contexts } = require('../models');
const { identifierPrefixes } = require('../utils/common-enums');

/*
"us-gaap:RepaymentsOfRelatedPartyDebt1": [
            {
                "$": {
                    "contextRef": "From2019-01-01to2019-03-31",
                    "unitRef": "USD",
                    "xsi:nil": "true"
                }
            },
            {
                "_": "6000",
                "$": {
                    "contextRef": "From2018-01-01to2018-03-31",
                    "unitRef": "USD",
                    "decimals": "-3"
                }
            }
        ],
*/

/*
{
    filing: {
        type: Schema.Types.ObjectId,
        ref: 'Filing',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    extensionType: {
        type: String,
        enum: require('../utils/common-enums').taxonomyExtensionTypes,
        required: true
    },
    gaapIdentifiers: [{
        type: Schema.Types.ObjectId,
        ref: 'GAAPIdentifier',
        required: true
    }],
    context: {
        type: Schema.Types.ObjectId,
        ref: 'Context',
        required: false
    },
    value: String,
}
*/

module.exports.formatFacts = async (unformattedFacts, contexts, extensionType, filing, company) => {
    let formattedFacts = [];
    for (let fact in unformattedFacts) {
        // we only want facts we can process
        if (identifierPrefixes.find(p => fact.includes(p))) {
            noPrefixFact = fact.substr(fact.indexOf(':') + 1);
            let identifiers = await gaapIdentifiers.model.find({ name: noPrefixFact });
            identifiers = identifiers.map(i => i._id);

            // we only want facts we have a matching identifier for
            if (Array.isArray(identifiers) && identifiers.length) {
                // console.log({ facts: unformattedFacts[fact], identifiers, fact });
                const likeFacts = formatLikeFacts(unformattedFacts[fact], extensionType, filing, company, identifiers);
                //  TODO :: Simplify once [formatLikeFacts] is fixed
                likeFacts.forEach((formatted) => {
                    formattedFacts.push(formatted);
                });
            } else {
                console.info(`no identifier found for ${fact} company ${company} filing ${filing}`);
            }
        }
    }

    return facts;
}

function formatLikeFacts(facts, extensionType, filing, company, gaapIdentifiers) {
    return facts.map((fact) => {
        const {
            contextRef,
            unitRef,
            decimals,
        } = fact['$'];
        console.log({ contextRef, unitRef, decimals });

        // TODO :: normalize [value] based on unitRef and decimals objects

        const query = { filing, company, extensionType, label: contextRef };
        contexts.model.findOne(query, (err, res) => {
            console.log({ err, res });

            if (res) {
                return {
                    company,
                    filing,
                    extensionType,
                    gaapIdentifiers,
                    value: fact['_'],
                    context: res._id,
                }
            }
        })
    });
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