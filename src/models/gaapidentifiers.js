const { model, Schema } = require('mongoose');
const logs = console.log.bind(console);
const { errorHandler } = require('../utils/error-helper');

const gaapIdentifierSchema = new Schema({
    extensionType: {
        type: String,
        enum: require('../utils/common-enums').taxonomyExtensionTypes,
        required: true,
    },
    extendedLinkRole: {
        type: String,
        required: true,
    },
    definition: {
        id: {
            type: String,
            default: null,
        },
        flag: {
            type: String,
            enum: require('../utils/common-enums').identifierDocumentFlags,
        },
        context: String,
    },
    prefix: {
        type: String,
        enum: require('../utils/common-enums').identifierPrefixes,
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
        required: true,
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
        ref: 'GAAPIdentifier',
        required: false,
    },
    children: {
        type: [Schema.Types.ObjectId],
        ref: 'GAAPIdentifier',
        required: true,
        default: [null]
    },
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

module.exports.createAll = async (items) => {
    return require('../utils/raw-data-helpers')
        .createByDepth(
            items, 
            this.create
        );
}

module.exports.create = async (newItem) => {
    return await new gaapIdentifierModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(errorHandler);
}

module.exports.findByDepth = async (depth) => {
    return await gaapIdentifierModel
        .find({ depth })
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
}

module.exports.findParentIdentifier = async (identifier) => {
    const { depth, parent, definition } = identifier;
    return await gaapIdentifierModel
        .findOne({ depth: depth - 1, name: parent, 'definition.id': definition.id }, { _id: 1 })
        .then((identifier) => {
            if (identifier) {
                logs('[server] fetched matching identifier', `${identifier}`);
                return identifier;
            }
        })
        .catch(errorHandler);
}