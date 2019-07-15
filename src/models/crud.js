class Crud {
    async create(model, createObject, fields) {
        createObject = {
            createdAt: new Date(),
            updatedAt: new Date(),
            ...createObject
        };

        return await model
            .create(createObject, fields)
    }

    async get(model, query, fields) {
        return await model
            .find(query, fields)
            .populate();
    }

    async getById(model, _id) {
        return await model
            .findOne({ _id })
            .populate()
    }

    async update(model, query, updateObject, fields) {
        updateObject = {
            updatedAt: new Date(),
            ...updateObject
        }

        return await model
            .update(query, updateObject, { upsert: true, multi: true })
    }

    async updateById(model, _id, updateObject, fields) {
        return await model
            .findOneAndUpdate({ _id }, updateObject, fields)
            .populate()
    }

    async delete(model, query) {
        return await model
            .deleteMany(query);
    }

    async deleteById(model, _id) {
        return await model
            .deleteOne({ _id });
    }

    async list(model, query, fields) {
        await this.get(model, query, fields);
    }
}

module.exports = Crud;