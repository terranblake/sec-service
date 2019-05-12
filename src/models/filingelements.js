const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

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

const filingElementModel = model('FilingElement', filingElementSchema);
module.exports.model = filingElementModel;

module.exports.create = async (newItem) => {
    return await new model(newItem)
        .save()
        .then((item) => {
            return item;
        })
        .catch(errors);
}

module.exports.deleteAll = async () => {
    return await model
        .deleteMany()
        .then((res) => {
            return res;
        })
        .catch(errors);
};