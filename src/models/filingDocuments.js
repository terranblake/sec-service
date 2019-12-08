const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const { filingDocumentTypes, itemStates } = require('../utils/common-enums');

const filingDocumentSchema = new Schema({
  filing: {
    type: Schema.Types.ObjectId,
    ref: 'Filing',
    required: true,
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  type: {
    type: String,
    enum: filingDocumentTypes,
    required: true,
  },
  status: {
    type: String,
    enum: itemStates,
    required: true,
  },
  // helper field for qualifying a status. e.g. if downloaded, 
  // there should be a local path or bucket id in this field
  statusReason: {
    type: String,
    required: false,
  },
  sequenceNumber: String,
  fileName: String,
  fileType: String,
  fileSize: String,
  fileDescription: String,
  fileUrl: String,
  createdAt: Date,
  updatedAt: Date,
});

filingDocumentSchema.index({
  filing: 1,
  company: 1,
  type: 1
});

const filingDocumentModel = model('FilingDocument', filingDocumentSchema)

module.exports.model = filingDocumentModel;