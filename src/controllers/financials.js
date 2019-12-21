const { keys } = require('lodash');

const { logs, errors } = require('../utils/logging');

const { getIdentifierTreeByTickerAndYear } = require('../controllers/facts');

const roleByFinancialStatement = require('../utils/financial-statements');
const financials = Object.keys(roleByFinancialStatement);

module.exports.getByCompanyAndYear = async (financial, ticker, year) => {
    const financialTree = { [financial]: {} };

    const financialRoles = roleByFinancialStatement[financial];
    for (let role of financialRoles) {
        const roleTree = await getIdentifierTreeByTickerAndYear(ticker, role, year);
    }
}