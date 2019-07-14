const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const { dateTypes, itemTypes } = require('../utils/common-enums');

/*

Fact
    * Filing (ref: Filing)
    * Company (ref: Company)
    * Identifier (ref: Identifier)
    * Name
    * Label
    * Date
        * Type (point, range) - use moment for point / moment-range for range
        * Value (string/object)
    * itemType (previously unitType)
    * Metadata
        * Balance (credit, debit)
        * sign
    * Value

*/

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
    identifier: {
        type: Schema.Types.ObjectId,
        ref: 'Identifier',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    date: {
        type: {
            type: String,
            enum: dateTypes,
            required: true,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
        },
    },
    itemType: {
        type: String,
        enum: itemTypes,
        required: true,
    },
    balance: String,
    sign: Boolean,
    value: String,
});

const factModel = model('Fact', factSchema);
module.exports.model = factModel;

const Crud = require('./crud');
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