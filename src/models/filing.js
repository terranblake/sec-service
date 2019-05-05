const { model, Schema } = require('mongoose');

const logs = console.log.bind(console);
const errors = console.error.bind(console);

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
  extensions: {
    type: [require('./taxonomy-extension').model.schema],
    required: true,
  },
});

const filingModel = model('Filing', filingSchema)

const create = async (newItem) => {
  return await new filingModel(newItem)
    .save()
    .then((createdItem) => {
      logs({ _id: createdItem._id })
      return createdItem;
    })
    .catch(errors);
}

const findMostRecentlyPublished = async () => {
  return await filingModel
    .findOne()
    .sort({ publishedAt: -1 })
    .exec()
    .then((rssItem) => {
      return rssItem;
    })
    .catch(errors);
};

const findAll = async () => {
  return await filingModel
    .find()
    .then((rssItem) => {
      return rssItem;
    })
    .catch(errors);
};

const deleteAll = async () => {
  return await filingModel
    .deleteMany()
    .then((result) => {
      return result;
    })
    .catch(errors);
};

const findById = async (_id) => {
  return await filingModel
    .find({ _id })
    .then((rssItem) => {
      return rssItem;
    })
    .catch(errors);
}

module.exports = {
  model: filingModel,
  methods: {
    findMostRecentlyPublished,
    findAll,
    deleteAll,
    create,
    findById
  }
};