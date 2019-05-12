const { model, Schema } = require('mongoose');
const errors = console.error.bind(console);
const { errorHandler } = require('../utils/error-helper');

const companySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    sic: String,
    ticker: {
        type: String,
        required: true,
        unique: true,
    },
    cik: {
        type: String,
        required: true,
        unique: true,
    },
    exchange: {
        type: String,
        enum: ['nasdaq', 'nyse'],
        required: true,
    },
    state: String,
    address: String,
});

const companyModel = model('Company', companySchema);
module.exports.model = companyModel;

module.exports.create = async (newItem) => {
    return await new companyModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(errorHandler);
}

module.exports.deleteAll = async () => {
    return await companyModel
        .deleteMany()
        .then((result) => {
            return result;
        })
        .catch(errorHandler);
};

module.exports.findById = async (_id) => {
    return await companyModel
        .findOne({ _id })
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
}

module.exports.findByCik = async (cik) => {
    return await companyModel
        .findOne({ cik: { $regex: new RegExp(cik) } })
        .then((company) => {
            return company;
        })
        .catch(errorHandler);
}