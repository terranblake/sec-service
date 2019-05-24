const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

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
  type: {
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
  taxonomyExtensions: [{
    type: Schema.Types.ObjectId,
    ref: 'TaxonomyExtension',
    required: true,
  }],
});

const filingModel = model('Filing', filingSchema);
module.exports.model = filingModel;

module.exports.create = async (newItem) => {
  return await new filingModel(newItem)
    .save()
    .then((result) => {
      return result;
    })
    .catch(errors);
}

module.exports.get = async (query, projection, paging) => {
  return await filingModel
    .find(query, projection, paging)
    .then((result) => {
      return result;
    })
    .catch(errors);
}

module.exports.delete = async (query) => {
  return await filingModel
    .deleteMany(query)
    .then((result) => {
      return result;
    })
    .catch(errors);
}

module.exports.deleteOne = async (query) => {
  return await filingModel
    .deleteOne(query)
    .then((result) => {
      return result;
    })
    .catch(errors);
}

module.exports.findOne = async (query, projection, paging) => {
  return await filingModel
    .findOne(query, projection, paging)
    .then((result) => {
      return result;
    })
    .catch(errors);
}