const { model, Schema } = require('mongoose');
const logs = console.log.bind(console);
const errors = console.error.bind(console);

const filingElementSchema = new Schema({
    filing: {
        type: Schema.Types.ObjectId,
        ref: 'Filing'
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
    },
    extensionType: {
        type: String,
        enum: require('../utils/common-enums').taxonomyExtensionTypes,
        required: true,
    },
    gaapIdentifier: String,
    properties: [{
        property: String,
        value: String,
    }],
    content: String,
});

const filingElementModel = model('FilingElement', filingElementSchema)

const create = async (newItem) => {
    return await new filingElementModel(newItem)
        .save()
        .then((createdItem) => {
            logs({ _id: createdItem._id })
            return createdItem;
        })
        .catch(errors);
}

const findAll = async () => {
    return await filingElementModel
        .find()
        .then((res) => {
            return res;
        })
        .catch(errors);
};

const deleteAll = async () => {
    return await filingElementModel
        .deleteMany()
        .then((res) => {
            return res;
        })
        .catch(errors);
};

const findById = async (_id) => {
    return await filingElementModel
        .find({ _id })
        .then((res) => {
            return res;
        })
        .catch(errors);
}

module.exports = {
    model: filingElementModel,
    methods: {
        findAll,
        deleteAll,
        create,
        findById
    }
};