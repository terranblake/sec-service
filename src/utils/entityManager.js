let model = {};

module.exports.getModel = (collectionName) => {
    console.log(`getting model for ${collectionName}`);
    if (model[collectionName] === undefined) {
        model[collectionName] = require('../models/' + collectionName).model;
    }

    return model[collectionName];
}

// module.exports.getController = (collectionName) => {
//     console.log(`getting controller for ${collectionName}`);
//     if (controller[collectionName] === undefined) {
//         controller[collectionName] = require('../controllers/' + collectionName).controller;
//     }

//     return controller[collectionName];
// }