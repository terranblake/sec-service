const { model, Schema } = require('mongoose');
const { errors } = require('../utils/logging');
const { dateTypes } = require('../utils/common-enums');

module.exports.validators = {
    members: (arr) => {
        if (!Array.isArray(arr) || !arr.length) {
            errors('members must be an array');
            return false;
        }

        for (let member in arr) {
            member = arr[member];
            if (!member.gaapDimension || !member.value) {
                errors('member must have gaapDimension and value');
                return false;
            }
        }

        return true;
    },
    period: (obj) => {
        // Must have a dateType which is instant/duration
        if (!dateTypes.includes(obj.dateType)) {
            return false;
        }

        const { dateType } = obj;
        switch (dateType) {
            case 'instant':
                return obj.instant;
            case 'duration':
                return obj.startDate && obj.endDate;
        }

        return false;
    }
}

const contextSchema = new Schema({
    label: {
        type: String,
        required: true
    },
    filing: {
        type: Schema.Types.ObjectId,
        ref: 'Filing',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    members: {
        type: Object,
        required: false,
        validate: this.validators.members
    },
    period: {
        type: Object,
        required: true,
        validate: this.validators.period
    }
});

contextSchema.index({
    label: 1,
    filing: 1,
    company: 1,
}, { unique: true });

const contextModel = model('Context', contextSchema);
module.exports.model = contextModel;

module.exports.create = async (newItem) => {
    return await new contextModel(newItem)
        .save()
        .then((item) => {
            return item;
        })
        .catch(errors);
}

module.exports.createAll = async (items) => {
    return items.map(async (item) => {
      item = await contextModel.create(item);
    });
  }

module.exports.deleteAll = async () => {
    return await contextModel
        .deleteMany()
        .then((res) => {
            return res;
        })
        .catch(errors);
};