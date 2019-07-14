const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');

/*

Filing
    * Source
    * Company (ref: Company)
    * Type (10k, 10q, s4)
    * refId (filer-unique identifier, e.g. accession number)
    * period (period the filing was published for; 
    *           time-series can be calculated based 
    *           on filing type and company fiscalYearEnd
    *           
    *           e.g.
    *                 10-Q: (period 09.30.2019) => (06.30.2019 - 09.30.2019) (quarterly subtract 3 months)
    *                 10-K: (period 09.30.2019) => (09.30.2018 - 09.30.2019) (annually subtract 12 months)
    * fiscalYearEnd (important for finding values for metrics)
    * Metadata
        * filedAt
        * publishedAt
        * acceptedAt
        * Name
        * Url
        * fileNumber
        * assistantDirector
        * Sic (industry code; company should store this as industry)

*/

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
    enum: require('../utils/common-enums').filingTypes,
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
  url: String,
  name: String,
  publishedAt: Date,
  filedAt: Date,
  acceptedAt: Date,
  accessionNumber: String,
  fileNumber: String,
});

const filingModel = model('Filing', filingSchema);
module.exports.model = filingModel;

const Crud = require('./crud');
const crud = new Crud(this.model);

module.exports.get = crud.get;
module.exports.list = crud.list;
module.exports.getById = crud.getById;

module.exports.create = async (newItem) => {
  return await new filingModel(newItem)
    .save()
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