const { model, Schema } = require('mongoose');

const logs = console.log.bind(console);
const errors = console.error.bind(console);
const { each } = require('lodash');
const { errorHandler } = require('../utils/error-helper');

const filingSchema = new Schema({
  source: {
    type: String,
    required: true,
  },
  sourceLink: String,
  publishTitle: String,
  publishedAt: {
    type: Date,
    required: true,
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  filingType: {
    type: String,
    enum: require('../utils/common-enums').filingTypes,
    required: true,
  },
  filingDate: {
    type: Date,
    required: true,
  },
  accessionNumber: {
    type: String,
    required: true,
    unique: true,
  },
  fileNumber: String,
  acceptanceDatetime: Date,
  period: String,
  assistantDirector: String,
  assignedSic: String,
  fiscalYearEnd: Date,
  taxonomyExtensions: {
    type: [Schema.Types.ObjectId],
    ref: 'TaxonomyExtension',
    required: true,
  },
});

const filingModel = model('Filing', filingSchema);
module.exports.filing = filingModel;

module.exports.create = async (newItem) => {
  return await new filingModel(newItem)
    .save()
    .then((result) => {
      return result;
    })
    .catch(errorHandler);
}

module.exports.get = async (query, projection, paging) => {
  return await filingModel
    .find(query, projection, paging)
    .then((result) => {
      return result;
    })
    .catch(errorHandler);
}

module.exports.delete = async (query) => {
  return await filingModel
    .deleteMany(query)
    .then((result) => {
      return result;
    })
    .catch(errorHandler);
}

module.exports.deleteOne = async (query) => {
  return await filingModel
    .deleteOne(query)
    .then((result) => {
      return result;
    })
    .catch(errorHandler);
}

module.exports.findOne = async (query, projection, paging) => {
  return await filingModel
    .findOne(query, projection, paging)
    .then((result) => {
      return result;
    })
    .catch(errorHandler);
}