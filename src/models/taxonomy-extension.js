const { model, Schema } = require('mongoose');
const { each } = require('async');
const filingElement = require('./filing-element').model.schema;

const logs = console.log.bind(console);
const errors = console.error.bind(console);

const taxonomyExtensionSchema = new Schema({
  filing: {
    type: Schema.Types.ObjectId,
    ref: 'Filing'
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  extensionType: {
    type: String,
    enum: require('../utils/common-enums').taxonomyExtensionTypes,
    required: true,
  },
  elements: [ filingElement ],
  sequence: String,
  fileName: String,
  fileType: String,
  description: String,
  url: String,
});

const taxonomyExtensionModel = model('TaxonomyExtension', taxonomyExtensionSchema)

const createAll = async (items) => {
  items.map(async (item) => {
    item = await create(item);
  });

  return items;
}

const create = async (item) => {
  return await new taxonomyExtensionModel(item)
    .save()
    .then(({ _id }) => {
      logs({ _id })
      return _id;
    })
    .catch(errors);
}

const findAll = async () => {
  return await taxonomyExtensionModel
    .find()
    .then((res) => {
      return res;
    })
    .catch(errors);
};

const deleteAll = async () => {
  return await taxonomyExtensionModel
    .deleteMany()
    .then((res) => {
      return res;
    })
    .catch(errors);
};

const findById = async (_id) => {
  return await taxonomyExtensionModel
    .find({ _id })
    .then((res) => {
      return res;
    })
    .catch(errors);
}

module.exports = {
  model: taxonomyExtensionModel,
  methods: {
    createAll,
    findAll,
    deleteAll,
    create,
    findById
  }
};