const { model, Schema } = require('mongoose');
const {
    dateTypes,
    dateSubTypes,
    itemTypes, 
    identifierPrefixes
} = require('../utils/common-enums');

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
    name: {
        type: String,
        required: true,
    },
    // defines if the fact was created as the result of a link
    // being used (calculation arcs)
    link: {
        type: Schema.Types.ObjectId,
        ref: 'Link',
        required: false
    },
    // used for facts which have a segment element defined in the
    // context that the fact references
    segment: [{
        // the dimension property of the explicitMember element
        dimension: {
            prefix: {
                type: String,
                // enum: identifierPrefixes
            },
            name: String
        },
        // the value property of the explicitMember element
        value: {
            prefix: {
                type: String,
                // enum: identifierPrefixes
            },
            name: String
        }
    }],
    date: {
        type: {
            type: String,
            enum: dateTypes,
            required: true,
        },
        quarter: {
            type: Number,
            enum: [1, 2, 3, 4],
        },
        year: {
            type: String,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
        },
    },
    itemType: {
        type: String,
        // enum: itemTypes,
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