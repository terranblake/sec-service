const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

// http://www.xbrl.org/utr/2017-07-12/utr.xml
const unitSchema = new Schema({
    identifier: {
        type: String,
        required: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        lowercase: true
    },
    type: {
        type: String,
        required: true,
        lowercase: true
    },
    nsUnit: String,
    nsItemType: String,
    symbol: String,
    definition: String,
    typeDate: Date,
    versionDate: Date,
    baseStandard: String,
});

const unitModel = model('Unit', unitSchema)
module.exports.model = unitModel;

module.exports.createAll = async (items) => {
    items.map(async (item) => {
        item = await unitModel.create(item);
    });

    return items;
}

module.exports.create = async (item) => {
    return await new unitModel(item)
        .save()
        .then((res) => {
            return res;
        })
        .catch(errors);
}