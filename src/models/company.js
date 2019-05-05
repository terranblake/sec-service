const { model, Schema } = require('mongoose');
const logs = console.log.bind(console);
const errors = console.error.bind(console);

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

const companyModel = model('Company', companySchema)

const create = async (newItem) => {
    return await new companyModel(newItem)
        .save()
        .then((createdItem) => {
            return createdItem;
        })
        .catch(errorHandler);
}

const findAll = async () => {
    return await companyModel
        .find()
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
};

const deleteAll = async () => {
    return await companyModel
        .deleteMany()
        .then((result) => {
            return result;
        })
        .catch(errorHandler);
};

const findById = async (_id) => {
    return await companyModel
        .findOne({ _id })
        .then((res) => {
            return res;
        })
        .catch(errorHandler);
}

const findByCik = async (cik) => {
    return await companyModel
        .findOne({ cik })
        .then((company) => {
            return company;
        })
        .catch(errorHandler);
}

function errorHandler(err) {
    switch (err.code) {
        case 11000: // duplicate key error
            break;
        default:
            errors({ MongoError: err });
    }
}

module.exports = {
    model: companyModel,
    methods: {
        findByCik,
        findAll,
        deleteAll,
        create,
        findById
    }
};