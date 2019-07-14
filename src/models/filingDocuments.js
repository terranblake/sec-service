const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

/*

FilingDocument
  * Filing (ref: Filing)
  * Company (ref: Company)
  * Type (instance, label, definition)
  * Status (unprocessed, processing, processed)
  * Metadata
    * sequenceNumber
    * Name
    * xbrlFormType
    * Size
    * Description
    * Url

*/

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
    enum: require('../utils/common-enums').filingDocumentTypes,
    required: true,
  },
  status: {
    type: String,
    enum: require('../utils/common-enums').extensionElementStatuses,
    required: true,
  },
  sequenceNumber: String,
  fileName: String,
  fileType: String,
  fileSize: String,
  fileDescription: String,
  fileUrl: String,
});

const filingDocumentModel = model('FilingDocument', filingDocumentSchema)
module.exports.model = filingDocumentModel;

module.exports.createAll = async (items) => {
  items.map(async (item) => {
    item = await create(item);
  });

  return items;
}

module.exports.create = async (item) => {
  return await new filingDocumentModel(item)
    .save()
    .then((res) => {
      return res;
    })
    .catch(errors);
}

module.exports.deleteAll = async () => {
  return await filingDocumentModel
    .deleteMany()
    .then((res) => {
      return res;
    })
    .catch(errors);
};