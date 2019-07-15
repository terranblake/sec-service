const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const { dateTypes, itemTypes } = require('../utils/common-enums');

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
    createdAt: Date,
    updatedAt: Date,
});

const factModel = model('Fact', factSchema);
module.exports.model = factModel;