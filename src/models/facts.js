const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

const factSchema = new Schema({
    filing: {
        type: Schema.Types.ObjectId,
        ref: 'Filing',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    extensionType: {
        type: String,
        enum: require('../utils/common-enums').taxonomyExtensionTypes,
        required: true
    },
    identifiers: {
        gaapIdentifierName: String,
        gaapCandidates: [{
            type: Schema.Types.ObjectId,
            ref: 'GAAPIdentifier',
            required: true
        }],
    },
    context: {
        type: Schema.Types.ObjectId,
        ref: 'Context',
        required: false
    },
    unit: {
        type: Schema.Types.ObjectId,
        ref: 'Unit',
        required: false
    },
    value: String,
});

const factModel = model('Fact', factSchema);
module.exports.model = factModel;

module.exports.create = async (newItem) => {
    return await new factModel(newItem)
        .save()
        .then((item) => {
            return item;
        })
        .catch(errors);
}

module.exports.createAll = async (items) => {
    return items.map(async (item) => {
        item = await factModel.create(item);
    });
}

module.exports.deleteAll = async () => {
    return await factModel
        .deleteMany()
        .then((res) => {
            return res;
        })
        .catch(errors);
};