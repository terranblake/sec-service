const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const {
    taxonomyExtensionTypes,
    identifierDocumentFlags,
    identifierPrefixes,
    periodTypes
} = require('../utils/common-enums');

const gaapIdentifierSchema = new Schema({
    extensionType: {
        type: String,
        // enum: taxonomyExtensionTypes,
        required: true,
    },
    extendedLinkRole: {
        type: String,
        required: false,
    },
    definition: {
        id: {
            type: String,
            default: null,
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
    // greatly suggested though
    unitType: {
        type: Schema.Types.ObjectId,
        ref: 'Unit',
        required: false,
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'GAAPIdentifier',
        required: false,
    },
    children: {
        type: [Schema.Types.ObjectId],
        ref: 'GAAPIdentifier',
        required: false,
    },
    periodType: {
        type: String,
        enum: periodTypes,
        required: false
    },
    abstract: Boolean,
    documentation: String,
});

gaapIdentifierSchema.index({
    name: 1
});

gaapIdentifierSchema.index({
    parent: 1,
    depth: 1,
});

gaapIdentifierSchema.index({
    parent: 1,
    depth: 1,
    children: 1
});

gaapIdentifierSchema.index({
    depth: 1,
    name: 1,
    'description.id': 1,
});

const gaapIdentifierModel = model('GAAPIdentifier', gaapIdentifierSchema);
module.exports.model = gaapIdentifierModel;

module.exports.createAll = async (items, createTree) => {
    if (createTree) {
        return require('../utils/raw-data-helpers')
            .createGaapTaxonomyTree(
                items,
                this.create
            );
    } else {
        items.map(async (item) => {
            item = await gaapIdentifierModel.create(item);
        });

        return items;
    }

}

module.exports.create = async (newItem) => {
    return await new gaapIdentifierModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(errors);
}

module.exports.findByDepth = async (depth) => {
    return await gaapIdentifierModel
        .find({ depth })
        .then((res) => {
            return res;
        })
        .catch(errors);
}

module.exports.findParentIdentifier = async (identifier) => {
    const { depth, parent, definition } = identifier;
    return await gaapIdentifierModel
        .findOne({ depth: depth - 1, name: parent, 'definition.id': definition.id }, { _id: 1 })
        .then((identifier) => {
            if (identifier) {
                return identifier;
            }
        })
        .catch(errors);
}