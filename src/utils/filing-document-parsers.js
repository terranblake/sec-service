const { Fact, Link } = require('@postilion/models');

const {
    formatFacts,
    formatUnits,
    formatContexts,
    formatCalculationLink
} = require('../utils/filing-document-helpers');

module.exports = {
    instance: async (elements, filingId, company) => {
        elements = elements['xbrli:xbrl'] || elements.xbrl;

        let rawUnits = elements['xbrli:unit'] || elements.unit;;
        const formattedUnits = formatUnits(rawUnits);

        const rawContexts = elements['xbrli:context'] || elements.context;
        const formattedContexts = await formatContexts(rawContexts);

        const newFacts = await formatFacts(elements, formattedContexts, formattedUnits, filingId, company);
        for (let fact of newFacts) {
            await Fact.create(fact);
        }

        return newFacts;
    },
    calculation: async (elements, filing, company) => {
        elements = elements['link:linkbase'] || elements.linkbase;

        let formattedLinks = [];
        const calculationLinks = elements['link:calculationLink'] || elements.calculationLink;
        for (let link of calculationLinks) {
            // get calculation arcs and skip this link if there aren't any
            // defined because all we want are the arcs between identfiiers
            const calculationArcs = link['link:calculationArc'] || [];
            if (!calculationArcs || !calculationArcs.length) {
                continue;
            }

            const formattedCalculationLinks = formatCalculationLink(link);
            formattedLinks = formattedLinks.concat(formattedCalculationLinks);
        }

        for (let link of formattedLinks) {
            await Link.create({ ...link, filing, company,  });
        }

        return formattedLinks;
    }
}