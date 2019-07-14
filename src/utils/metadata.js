const request = require('request');
const { logs } = require('../utils/logging');

module.exports.getMetadata = (model, ticker, accessionNumber) => {
	return new Promise((resolve, reject) => {
        const config = require('config');
        // TODO :: Add metadata-service to encrypted config
        const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';
        const endpoint = `${metadataService}/${model}?ticker=${ticker}${accessionNumber && `&accessionNumber=${accessionNumber}`}`;

        let data = "";
        request
            .get(endpoint)
            .on('response', (response) => {
                logs(`retrieving metadata for ${accessionNumber}`);
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logs(`retrieved metadata for ${accessionNumber}`);
                    data = JSON.parse(data);
                    resolve(data);
                });
            })
            .on('error', (err) => reject(err));
    });
}