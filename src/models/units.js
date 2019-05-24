const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

// http://www.xbrl.org/utr/2017-07-12/utr.xml
const unitSchema = new Schema({
    identifier: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: require('../utils/common-enums').unitTypes,
        required: true,
    },
    nsUnit: String,
    nsItemType: String,
    symbol: String,
    definition: String,
    itemTypeDate: Date,
    versionDate: Date,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
});

const unitModel = model('Unit', unitSchema)
module.exports.model = unitModel;

module.exports.createAll = async (items) => {
    items.map(async (item) => {
        item = await create(item);
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