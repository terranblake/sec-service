const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

const companySchema = new Schema({
    name: {
        type: String,
        required: true,
        lowercase: true
    },
    sic: {
        type: String,
        lowercase: true
    },
    ticker: {
        type: String,
        required: true,
        lowercase: true
    },
    cik: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    exchange: {
        type: String,
        enum: ['nasdaq', 'nyse', 'otc', 'otcbb', 'bats', 'nyse mkt', 'nyse arca', null],
        required: false,
        lowercase: true
    },
    state: String,
    address: String,
});

companySchema.index({
    ticker: 1,
    exchange: 1,
    sic: 1
}, { unique: true })

const companyModel = model('Company', companySchema);
module.exports.model = companyModel;

module.exports.create = async (newItem) => {
    return await new companyModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(errors);
}

module.exports.deleteAll = async () => {
    return await companyModel
        .deleteMany()
        .then((result) => {
            return result;
        })
        .catch(errors);
};

module.exports.findById = async (_id) => {
    return await companyModel
        .findOne({ _id })
        .then((res) => {
            return res;
        })
        .catch(errors);
}

module.exports.findByCik = async (cik) => {
    return await companyModel
        .findOne({ cik: { $regex: new RegExp(cik) } })
        .then((company) => {
            return company;
        })
        .catch(errors);
}