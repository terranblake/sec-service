const { units } = require('../models');
const { createAll } = require('../models/units');

const request = require('request');

const { logs } = require('../utils/logging');
const config = require('config');


module.exports.fetch = async function () {
    const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';
    const endpoint = `${metadataService}/units`;
    
    let data;
    return new Promise((resolve, reject) => {
        request
            .get(endpoint)
            .on('response', (response) => {
                logs(`retrieving metadata for units`);
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logs(`retrieved metadata for units`);

                    // check that this company doesn't exist
                    // create new company if it doesn't
                    // return the entire new company object
                    data = data.replace('undefined', '');
                    resolve(JSON.parse(data));
                });
            })
            .on('error', (err) => reject(err));
    });
};