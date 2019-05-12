const express = require('express');
const Entity = require('./entityManager');

const { isEmpty } = require('lodash');

module.exports.init = () => {
    const routerApi = express.Router();

    routerApi.route('/:collectionName').get(function (req, res) {
        const collectionName = req.params.collectionName;
        const entityModel = Entity.getModel(collectionName);

        let query = queryReducer(entityModel, req.query || {});
        if (!query || typeof query === 'object' && isEmpty(query)) {
            let response = responseBuilder(collectionName, null, null)
            return res.status(response.code).json(response);
        }

		entityModel.find(query).exec(function (err, entities) {
			if (err) {
				return res.send(err);
            }
            
            let response = responseBuilder(collectionName, query, entities);
			res.status(response.code).json(response);
		});
    });
    
    return routerApi;
}

function responseBuilder (collectionName, query, entities) {
    let response = {
        count: entities ? entities.length : undefined,
        code: entities ? 200 : 404,
        [collectionName]: entities || [],
        metadata: {
            collectionName,
            query: query || 'The reduced query is empty. Please use the pattern GET /:id if querying for a specific document',
            schema: Entity.getModel(collectionName).schema.obj
        }
    };

    return response;
}

function queryReducer (model, query) {
    const queryFields = Object.keys(query);
    let modelFields = Object.keys(model.schema.obj);

    return modelFields.reduce((acc, field) => {
        return queryFields.includes(field) ?
            Object.assign( { [field]: query[field] }, acc) :
            acc;
    }, [])
}