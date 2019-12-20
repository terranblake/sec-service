const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

const {
    itemTypes,
    identifierPrefixes,
    filingDocumentTypes,
} = require('../utils/common-enums');

const identifierSchema = new Schema({
    documentType: {
        type: String,
        enum: filingDocumentTypes,
        required: true,
    },
    itemType: {
        type: String,
        enum: itemTypes,
        required: false
    },
    extendedLinkRole: {
        type: String,
        required: false,
    },
    // extracts the last 2 values from the extended link role
    // to provide context on where the identifier => fact can
    // be found in the actual filing document
    role: {
        type: {
            type: String,
            enum: ['statement', 'disclosure'],
            required: false
        },
        // todo: get list of roles that we actually want
        // to consume and move to common-enums to be
        // used when creating facts using identifiers
        name: String,
        id: String
    },
    // definition: {
    //     id: {
    //         type: String,
    //     },
    //     flag: {
    //         type: String,
    //         enum: identifierDocumentFlags,
    //     },
    //     context: String,
    // },
    prefix: {
        type: String,
        enum: identifierPrefixes,
    },
    name: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    depth: {
        type: Number,
        required: false,
    },
    order: {
        type: Number,
        required: false,
    },
    weight: {
        type: Number,
        required: false,
    },
    parent: {
        type: String,
        require: false
    },
    abstract: Boolean,
    documentation: String,
    createdAt: Date,
    updatedAt: Date,
    version: String,
});

identifierSchema.index({
    name: 1
});

identifierSchema.index({
    parent: 1,
    depth: 1,
});

identifierSchema.index({
    depth: 1,
    name: 1,
    'description.id': 1,
});

const identifierModel = model('Identifier', identifierSchema);
module.exports.model = identifierModel;

module.exports.createAll = async (items, createTree) => {
    if (createTree) {
        return require('../utils/raw-data-helpers')
            .createTaxonomyTree(
                items,
                this.create
            );
    } else {
        items.map(async (item) => {
            item = await identifierModel.create(item);
        });

        return items;
    }
}

module.exports.findByDepth = async (depth) => {
    return await identifierModel
        .find({ depth })
        .then((res) => {
            return res;
        })
        .catch(errors);
}

module.exports.findParentIdentifier = async (depth, parent, roleId, version) => {
    const query = {
        depth: depth - 1,
        name: parent,
        'role.id': roleId,
        version
    };

    return await identifierModel
        .findOne(query, { _id: 1 })
        .then((identifier) => {
            if (identifier) {
                return identifier;
            }
        })
        .catch(errors);
}