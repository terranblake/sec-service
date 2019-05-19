const { filings, facts, taxonomyExtensions } = require('../models');
const {
    createFilingFromRssItem,
    downloadExtension,
    saveExtension,
    reformatExtension
} = require('../utils/raw-data-helpers');
const gcp = require('../utils/gcp');
const { fetchLinks } = require('../utils/common-enums');
const { logs, errors } = require('../utils/logging');
const async = require('async');
const { rss, taxonomyExtension } = require('../utils/parser-options');

const { each } = require('lodash');

module.exports.fetchLatestFilings = async function (fetchSource) {
    let Parser = require('rss-parser');
    let parser = new Parser(rss);

    const url = fetchLinks[fetchSource];
    let feed = await parser.parseURL(url);

    for (const key in Object.keys(feed.items)) {
        const item = feed.items[key];
        const filing = await createFilingFromRssItem(item);

        // TODO :: Make a topic resolver for a
        //          decoupled topic approach
        if (filing) {
            gcp.pubsub.publish('UnprocessedFilings', filing);
        }
    };

    return feed.items.length;
};

module.exports.parseFiling = async function (filing) {
    const { taxonomyExtensions, company } = await filings.model
        .findOne({ _id: filing }, { taxonomyExtensions: 1 })
        .lean()
        .populate({ path: 'taxonomyExtensions' })
        .populate({ path: 'company' });

    logs(`parsing filing ${filing} for ${company.name || company._id}`);

    for (let extension in taxonomyExtensions) {
        extension = taxonomyExtensions[extension];
        const { url, extensionType } = extension;

        let elements = await downloadExtension(url, taxonomyExtension, true);

        // TODO :: Remove this in favor of check that the
        //          accession number already exists in db
        saveExtension(extension.extensionType, elements);
        const formattedExtension = reformatExtension(filing, company._id, extensionType, elements);

        // if (elements) {
        //     elements = await facts.createAll(extensionElements);
        //     extension = await taxonomyExtensions.model.findByIdAndUpdate(filing, { elements });
        // }
    }

    return taxonomyExtensions;
}