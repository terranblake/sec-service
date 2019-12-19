const { model, Schema } = require('mongoose');
const { identifierPrefixes } = require('../utils/common-enums');

const linkSchema = new Schema({
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
    name: {
        type: String,
        required: true,
    },
    role: {
        name: String,
        arc: String
    },
    to: {
        name: String,
        prefix: String
    },
    from: {
        name: String,
        prefix: String
    },
    order: Number,
    weight: Number,
    type: String,
});

const linkModel = model('Link', linkSchema);
module.exports.model = linkModel;