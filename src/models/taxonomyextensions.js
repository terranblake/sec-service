const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

const taxonomyExtensionSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  type: {
    type: String,
    enum: require('../utils/common-enums').taxonomyExtensionTypes,
    required: true,
  },
  status: {
    type: String,
    enum: require('../utils/common-enums').extensionElementStatuses,
    required: true,
  },
  facts: [{
    type: Schema.Types.ObjectId,
    ref: 'Fact',
    required: false,
  }],
  contexts: [{
    type: Schema.Types.ObjectId,
    ref: 'Context',
    required: false
  }],
  units: [{
    type: Object,
    required: false
  }],
  sequence: String,
  fileName: String,
  fileType: String,
  fileSize: String,
  description: String,
  url: String,
});

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
    .catch(errors);
}

module.exports.deleteAll = async () => {
  return await taxonomyExtensionModel
    .deleteMany()
    .then((res) => {
      return res;
    })
    .catch(errors);
};