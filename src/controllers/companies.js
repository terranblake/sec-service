
const request = require("request");

const { logs, errors } = require('../utils/logging');
const companies = require('../models/companies');

module.exports.validationReducer = async (tickers) => {
    let found = [];
    for (let ticker of tickers) {
        ticker = ticker.toLowerCase();
        let company = await companies.model.findOne({ ticker });

        if (company) {
            found.push(company);
        } else {
            let metadata = await this.getMetadata(ticker);

            if (metadata && metadata.ticker === ticker) {
                company = await companies.create(metadata);
                found.push(company);
            } else {
                errors(`unable to find company with ticker ${ticker}`);
            }
        }
    }

    return found;
}

module.exports.getMetadata = (identifier) => {
    const config = require('config');
    // TODO :: Add metadata-service to encrypted config
    const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';
    const endpoint = `${metadataService}/companies?ticker=${identifier}`;

    let data = "";
    return new Promise((resolve, reject) => {
        request
            .get(endpoint)
            .on('response', (response) => {
                logs(`retrieving metadata for ${identifier}`);
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logs(`retrieved metadata for ${identifier}`);

                    // check that this company doesn't exist
                    // create new company if it doesn't
                    // return the entire new company object
                    resolve(JSON.parse(data));
                });
            })
            .on('error', (err) => reject(err));
    });
}