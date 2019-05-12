const { model, Schema } = require('mongoose');
const logs = console.log.bind(console);
const errors = console.error.bind(console);
const { errorHandler } = require('../utils/error-helper');

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

module.exports.model = model('FilingElement', filingElementSchema)

module.exports.create = async (newItem) => {
    return await new model(newItem)
        .save()
        .then((item) => {
            return item;
        })
        .catch(errorHandler);
}

module.exports.deleteAll = async () => {
    return await model
        .deleteMany()
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
};