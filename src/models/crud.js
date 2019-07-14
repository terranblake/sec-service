class Crud {
    constructor(model) {
        this.model = model;
    }

    async get(query, fields) {
        return await this.model
            .find(query, fields)
            .populate();
    }

    async getById(_id) {
        return await this.model
            .findOne({ _id })
            .populate()
            .then((res) => {
                return res;
            })
            .catch(console.error);
    }

    async list(query, fields) {
        return this.get(query, fields);
    }
}

module.exports = Crud;