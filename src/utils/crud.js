const baseOperations = { 
    create: {},
    read: {},
    update: {},
    delete: {}
};

module.exports.crud = (model) => {
    if (!model) {
        return new Error('undefined model. bailing...');
    }

    return crudGenerator(baseOperations);
}