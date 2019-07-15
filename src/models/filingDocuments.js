const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const { filingDocumentTypes, filingDocumentStatuses } = require('../utils/common-enums');

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
    enum: filingDocumentStatuses,
    required: true,
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

const filingDocumentModel = model('FilingDocument', filingDocumentSchema)
module.exports.model = filingDocumentModel;