const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

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