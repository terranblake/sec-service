const { companies } = require('../models');
const { logs } = require('../utils/logging');
const request = require("request");

module.exports.validationReducer = async (tickers) => {
    let found = [];
    for (let ticker in tickers) {
        ticker = tickers[ticker];
        let company = await companies.model.findOne({ ticker });

        if (company) {
            found.push(company);
        } else {
            const metadata = await this.getCompanyMetadata(ticker);
            logs(typeof metadata, metadata);
            company = await companies.create(JSON.parse(metadata));

            if (company && company.ticker === ticker) {
                found.push(company);
            } else {

            }
        }
    }

    return found;
}

module.exports.getCompanyMetadata = (identifier) => {
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
                    console.log('retrieved metadata for ' + JSON.parse(data).name);

                    // check that this company doesn't exist
                    // create new company if it doesn't
                    // return the entire new company object
                    resolve(data);
                });
            })
            .on('error', (err) => reject(err));
    });
}