
const { logger, metadata } = require('@postilion/utils');
const { Company } = require('@postilion/models');

module.exports.validationReducer = async (tickers) => {
    let found = [];
    for (let ticker of tickers) {
        ticker = ticker.toLowerCase();
        let company = await Company.findOne({ ticker });

        if (company) {
            found.push(company);
        } else {
            const metadataObj = await metadata(Company, ticker);

            if (metadataObj && metadataObj.ticker === ticker) {
                company = await Company.create(metadataObj);
                found.push(company);
            } else {
                logger.error(`unable to find company with ticker ${ticker}`);
            }
        }
    }

    return found;
}