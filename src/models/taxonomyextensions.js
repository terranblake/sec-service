const { model, Schema } = require('mongoose');
const errors = console.error.bind(console);
const { errorHandler } = require('../utils/error-helper');

const taxonomyExtensionSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  extensionType: {
    type: String,
    enum: require('../utils/common-enums').taxonomyExtensionTypes,
    required: true,
  },
  elementStatus: {
    type: String,
    enum: require('../utils/common-enums').extensionElementStatuses,
    required: true,
  },
  elements: {
    type: [require('./filingelements').model.schema],
    required: false,
  },
  sequence: String,
  fileName: String,
  fileType: String,
  fileSize: String,
  description: String,
  url: String,
});

// taxonomyExtensionSchema.index({
//   company: 1,
//   extensionType: 1
// }, { unique: true });

const taxonomyExtensionModel = model('TaxonomyExtension', taxonomyExtensionSchema)
module.exports.model = taxonomyExtensionModel;

module.exports.createAll = async (items) => {
  items.map(async (item) => {
    item = await create(item);
  });

  return items;
}

// TODO :: Listen for taxonomy-extension creation events
//              when created, query and process each element
//              in the original file
module.exports.create = async (item) => {
  return await new taxonomyExtensionModel(item)
    .save()
    .then((res) => {
      return res;
    })
    .catch(errorHandler);
}

module.exports.deleteAll = async () => {
  return await taxonomyExtensionModel
    .deleteMany()
    .then((res) => {
      return res;
    })
    .catch(errorHandler);
};