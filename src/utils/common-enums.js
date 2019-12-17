module.exports = {
    states: [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
        "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
        "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
    ],
    itemStates: [
        'seeded',       // node has been found and needs to be crawled
        'downloading',  // node has more data than initial state that needs to be gathered before branching can begin
        'downloaded',   // node peripheral information has been gathered. branching can begin
        'crawling',     // node is being crawled for child components (if part of model controller definition)
        'crawled',      // node has been crawled for all immediate neighbors/children (e.g. a filing is in the crawled state once all FilingDocument documents have been created)
        
        // todo:
        // there might need to be a separate completed state based on the implementation that comes after, but the current thought is that a node can and should be recrawled
        // regularly, so having a completed state is only necessary if there are intermediary steps that would come after being crawled which need a separate state

        'failed'        // node was  unsuccessful in completng one of the following steps. view the accompanying models `statusReason` field to find out why
    ],
    filingDocumentTypes: ['calculation', 'presentation', 'label', 'definition', 'instance', 'schema', 'elements'],
    filingTypes: ['10-K', '10-Q', '20-F', 'S-1', 'POS AM', 'S-1/A', '485BPOS', '10-K/A', '497', '10-Q/A', '40-F', '8-K', '10-K405'],
    filingSubTypes: {
        '10-K': [
            'BusinessOperations',
            'RiskFactors',
            'SelectedFinancialData',
            'ManagementDiscussionAnalysis',
            'IncomeStatement',
            'BalanceSheet',
            'StatementOfCashFlows'
        ]
    },
    identifierPrefixes: ['us-gaap', 'srt', 'gaap', 'currency', 'stpr', 'exch', 'country', 'dei'],
    identifierDocumentFlags: ['statement', 'disclosure'],
    supportedRegulators: {
        'sec': {
            'all': 'https://www.sec.gov/Archives/edgar/xbrlrss.all.xml',
            'by_cik': (cik = null, type = '10-K', count = 1000) => `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${type}&dateb=&owner=exclude&start=0&count=${count}&output=atom`,
        }
    },
    factCurrencies: ['USD', 'iso4217_USD', 'iso4217-usd', 'usd', 'U_iso4217USD', 'iso4217:USD'],
    // http://www.xbrl.org/utr/2017-07-12/utr.xml
    itemTypes: ['monetaryItemType', 'durationItemType', 'stringItemType', 'textItemType'],
    dateTypes: ['quarter', 'year', 'month', 'instant'],
    exchanges: ['nasdaq', 'nyse', 'otc', 'otcbb', 'bats', 'nyse mkt', 'nyse arca', null],
}