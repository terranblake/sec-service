module.exports = {
    states: [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
        "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
        "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
    ],
    extensionElementStatuses: ['unprocessed', 'queued', 'processing', 'finished', 'failed'],
    taxonomyExtensionTypes: ['calculation', 'presentation', 'label', 'definition', 'instance', 'schema'],
    filingTypes: ['10-K', '10-Q', '20-F', 'S-1', 'POS AM', 'S-1/A', '485BPOS', '10-K/A', '497', '10-Q/A', '40-F', '8-K', '10-K405'],
    identifierPrefixes: ['us-gaap', 'srt', 'gaap', 'currency', 'stpr', 'exch', 'country', 'dei'],
    identifierDocumentFlags: ['Statement', 'Disclosure'],
    dateTypes: ['instant', 'duration'],
    fetchLinks: {
        'sec': {
            'all': 'https://www.sec.gov/Archives/edgar/xbrlrss.all.xml',
            'by_cik': (cik = null, type = '10-K', count = 1000) => `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${type}&dateb=&owner=exclude&start=0&count=${count}&output=atom`,
        }
    },
    factCurrencies: ['USD', 'iso4217_USD', 'iso4217-usd', 'usd', 'U_iso4217USD', 'iso4217:USD'],
    // http://www.xbrl.org/utr/2017-07-12/utr.xml
    unitTypes: ['monetaryItemType', 'durationItemType', 'stringItemType'],
    periodTypes: ['duration', 'instant'],
    exchanges: ['nasdaq', 'nyse', 'otc', 'otcbb', 'bats', 'nyse mkt', 'nyse arca', null],
}