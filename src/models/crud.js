class Crud {
    async create(model, createObject, fields) {
        createObject = {
            createdAt: new Date(),
            updatedAt: new Date(),
            ...createObject
        };

        await model.create(createObject, fields)
    }

    async get(model, query, fields) {
        await model.find(query, fields);
    }

    async getById(model, _id) {
        await model.findOne({ _id })
    }

    async update(model, query, updateObject, fields) {
        updateObject = {
            updatedAt: new Date(),
            ...updateObject
        }

        await model.update(query, updateObject, { upsert: true, multi: true })
    }

    async updateById(model, _id, updateObject, fields) {
        await model.findOneAndUpdate({ _id }, updateObject, fields)
    }

    async delete(model, query) {
        await model.deleteMany(query);
    }

    async deleteById(model, _id) {
        await model.deleteOne({ _id });
    }

    async list(model, query, fields) {
        await this.get(model, query, fields);
    }
}

module.exports = Crud;