const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const { filingTypes, itemStates } = require('../utils/common-enums');

const filingSchema = new Schema({
  source: {
    type: String,
    required: true,
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  type: {
    type: String,
    enum: filingTypes,
    required: true,
  },
  refId: {
    type: String,
    required: true,
  },
  period: {
    type: Date,
    required: true,
  },
  fiscalYearEnd: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: itemStates,
    required: true,
    default: 'seeded',
  },
  url: String,
  name: String,
  publishedAt: Date,
  filedAt: Date,
  acceptedAt: Date,
  accessionNumber: String,
  fileNumber: String,
  createdAt: Date,
  updatedAt: Date,
});

filingSchema.index({
  company: 1,
  refId: 1
}, { unique: true });

const filingModel = model('Filing', filingSchema);
module.exports.model = filingModel;