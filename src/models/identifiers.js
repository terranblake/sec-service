const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const {
    filingDocumentTypes,
    identifierDocumentFlags,
    identifierPrefixes,
    periodTypes,
    itemTypes
} = require('../utils/common-enums');

/*

Identifier
    * documentType
    * Definition
        * Id
        * Flag
        * Context
    * Prefix
    * Name
    * Label
    * Depth
    * Order
    * Weight
    * itemType (textItemType, monetaryItemType)
    * Parent
    * periodType
    * Abstract
    * Documentation

*/

const identifierSchema = new Schema({
    documentType: {
        type: String,
        enum: filingDocumentTypes,
        required: true,
    },
    itemType: {
        type: String,
        enum: itemTypes,
        required: true
    },
    extendedLinkRole: {
        type: String,
        required: false,
    },
    definition: {
        id: {
            type: String,
        },
        flag: {
            type: String,
            enum: identifierDocumentFlags,
        },
        context: String,
    },
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
        type: Schema.Types.ObjectId,
        ref: 'Identifier',
        required: false,
    },
    // children: {
    //     type: [Schema.Types.ObjectId],
    //     ref: 'Identifier',
    //     required: false,
    // },
    periodType: {
        type: String,
        enum: periodTypes,
        required: false
    },
    abstract: Boolean,
    documentation: String,
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

module.exports.create = async (newItem) => {
    return await new identifierModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(errors);
}

module.exports.findByDepth = async (depth) => {
    return await identifierModel
        .find({ depth })
        .then((res) => {
            return res;
        })
        .catch(errors);
}

module.exports.findParentIdentifier = async (identifier) => {
    const { depth, parent, definition } = identifier;
    return await identifierModel
        .findOne({ depth: depth - 1, name: parent, 'definition.id': definition.id }, { _id: 1 })
        .then((identifier) => {
            if (identifier) {
                return identifier;
            }
        })
        .catch(errors);
}