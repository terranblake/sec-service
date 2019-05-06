const { model, Schema } = require('mongoose');
const logs = console.log.bind(console);
const errors = console.error.bind(console);

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

const gaapIdentifierModel = model('GAAPIdentifier', gaapIdentifierSchema)

const createAll = async (items) => {
    return require('../utils/raw-data-helpers').createByDepth(items, gaapIdentifierModel.create);
}

const create = async (newItem) => {
    return await new gaapIdentifierModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(errorHandler);
}

const findAll = async () => {
    return await gaapIdentifierModel
        .find()
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
};

const deleteAll = async () => {
    return await gaapIdentifierModel
        .deleteMany()
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
};

const findById = async (_id) => {
    return await gaapIdentifierModel
        .find({ _id })
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
}

const findByDepth = async (depth) => {
    return await gaapIdentifierModel
        .find({ depth })
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
}

const findParentIdentifier = async (identifier) => {
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

function errorHandler(err) {
    switch (err.name) {
        case 'TypeError':
        case 'MongoError':
        case 'ValidationError':
            errors('[server] GaapIdentifier'.error, err.name, err.message);
            break;
        default:
            errors({ MongoError: err });
    }
}

module.exports = {
    model: gaapIdentifierModel,
    methods: {
        createAll,
        findAll,
        deleteAll,
        create,
        findById,
        findByDepth,
        findParentIdentifier,
    }
};