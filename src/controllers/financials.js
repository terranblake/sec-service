const {
    logger,
    roleByFinancial
} = require('@postilion/utils');

const { getIdentifierTreeByTickerAndYear } = require('../controllers/facts');

module.exports.getByCompanyAndYear = async (financial, ticker, year, quarter) => {
    const financialTree = { [financial]: {} };

    // const financialRoles = [
    //     // primary
    //     'StatementOfIncome', 
    //     // 'StatementOfIncomeFirstAlternative',
    //     // // secondary
    //     // 'StatementOfOtherComprehensiveIncome',
	// 	// 'StatementOfOtherComprehensiveIncomeAlternative',
    //     // // tertiary
	// 	// 'ReceivablesLoansNotesReceivableAndOthers',
    //     // 'ReceivablesLoansNotesReceivableAndOthersLoansAlternate'
    // ];
    // //roleByFinancial[financial];
    // for (let role of financialRoles) {
    //     logger.info(`building tree for role ${role}`);

    //     // todo: finish building the tree in an api-safe format
    //     const roleTree = await getIdentifierTreeByTickerAndYear(ticker, role, year, quarter);
    //     financialTree[role] = roleTree;
    // }

    return await getIdentifierTreeByTickerAndYear(ticker, 'StatementOfIncome', year, quarter);
}