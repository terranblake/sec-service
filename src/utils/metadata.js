const request = require('request');
const config = require('config');
const { promisify } = require('util');

const requestAsync = promisify(request);

const { logger } = require('@postilion/utils');

module.exports.getMetadata = async (model, ticker, accessionNumber) => {
    // TODO :: Add metadata-service to encrypted config
    const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';

    accessionNumber = accessionNumber && `&accessionNumber=${accessionNumber}` || '';
    const url = `${metadataService}/${model}?ticker=${ticker}${accessionNumber}`;

    const { body = {} } = await requestAsync({ method: 'GET', url, json: true });
    return body;
}

module.exports.units = () => {
    return new Promise((resolve, reject) => {
        const config = require('config');
        // TODO :: Add metadata-service to encrypted config
        const metadataService = config.has('metadata-service.base') || 'http://localhost:5000';
        const endpoint = `${metadataService}/units`;

        let data = "";
        request
            .get(endpoint)
            .on('response', (response) => {
                logger.info('retrieving units');
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    logger.info('retrieved units');
                    data = JSON.parse(data);
                    resolve(data);
                });
            })
            .on('error', (err) => reject(err));
    });
}