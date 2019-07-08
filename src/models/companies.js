const { model, Schema } = require('mongoose');
const { exchanges } = require('../utils/common-enums');

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
        enum: exchanges,
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

const Crud = require('../utils/crud');
const crud = new Crud(this.model);

module.exports.get = crud.get;
module.exports.list = crud.list;
module.exports.getById = crud.getById;

module.exports.create = async (newItem) => {
    newItem.ticker = newItem.ticker.trim();
    return await new companyModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(console.error);
}

module.exports.deleteAll = async () => {
    return await companyModel
        .deleteMany()
        .then((result) => {
            return result;
        })
        .catch(console.error);
};

// module.exports.findById = async (_id) => {
//     return await companyModel
//         .findOne({ _id })
//         .then((res) => {
//             return res;
//         })
//         .catch(console.error);
// }

module.exports.findByCik = async (cik) => {
    return await companyModel
        .findOne({ cik: { $regex: new RegExp(cik) } })
        .then((company) => {
            return company;
        })
        .catch(console.error);
}