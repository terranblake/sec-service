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

const Crud = require('../utils/crud');
const crud = new Crud(this.model);

module.exports.get = crud.get;
module.exports.list = crud.list;
module.exports.getById = crud.getById;

module.exports.create = async (newItem) => {
    return await new factModel(newItem)
        .save()
        .then((item) => {
            return item;
        })
        .catch((err) => {
            logs(`unable to create fact with error ${err}`);
            throw new Error(err);
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