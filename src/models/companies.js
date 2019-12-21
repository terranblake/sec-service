const { model, Schema } = require('mongoose');
const { exchanges } = require('../utils/common-enums');
const { supportedRegulators } = require('../utils/common-enums');

const companySchema = new Schema({
    name: {
        type: String,
        required: true,
        lowercase: true
    },
    ticker: {
        type: String,
        required: true,
        lowercase: true
    },
    ref: {
        type: String,
        enum: Object.keys(supportedRegulators),
        required: true,
    },
    refId: {
        type: String,
        required: true,
    },
    refIndustryId: {
        type: String,
        required: true,
    },
    fiscalYearEnd: {
        type: Date,
        required: false,
    },
    exchange: {
        type: String,
        enum: exchanges,
        required: false,
        lowercase: true
    },
    state: String,
    country: String,
    address: String,
    createdAt: Date,
    updatedAt: Date,
});

companySchema.index({
    ticker: 1,
    exchange: 1,
    sic: 1
}, { unique: true });

const companyModel = model('Company', companySchema);
module.exports.model = companyModel;