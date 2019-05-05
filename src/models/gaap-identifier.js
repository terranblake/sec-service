const { model, Schema } = require('mongoose');
const logs = console.log.bind(console);
const errors = console.error.bind(console);

const gaapIdentifierSchema = new Schema({
    extensionType: {
        type: String,
        enum: require('../utils/common-enums').taxonomyExtensionTypes,
        required: true,
    },
    extensionLinkRole: {
        type: String,
        required: true,
    },
    definition: {
        type: String,
        required: true,
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
        required: true,
    },
    weight: {
        type: Number,
        required: false,
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'GAAPIdentifier',
        required: true,
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
    children: 1
});

gaapIdentifierSchema.index({
    parent: 1,
});

gaapIdentifierSchema.index({
    depth: 1,
    parent: 1,
});

gaapIdentifierSchema.index({
    depth: 1,
    order: 1,
    parent: 1,
});

const gaapIdentifierModel = model('GAAPIdentifier', gaapIdentifierSchema)

const create = async (newItem) => {
    return await new gaapIdentifierModel(newItem)
        .save()
        .then((createdItem) => {
            logs({ _id: createdItem._id })
            return createdItem;
        })
        .catch(errors);
}

const findAll = async () => {
    return await gaapIdentifierModel
        .find()
        .then((res) => {
            return res;
        })
        .catch(errors);
};

const deleteAll = async () => {
    return await gaapIdentifierModel
        .deleteMany()
        .then((res) => {
            return res;
        })
        .catch(errors);
};

const findById = async (_id) => {
    return await gaapIdentifierModel
        .find({ _id })
        .then((res) => {
            return res;
        })
        .catch(errors);
}

const findAllChildren = async (_id) => {
    return await gaapIdentifierModel
        .find({ _id })
        .then((res) => {
            return res;
        })
        .catch(errors);
}

module.exports = {
    model: gaapIdentifierModel,
    methods: {
        findAll,
        deleteAll,
        create,
        findById
    }
};