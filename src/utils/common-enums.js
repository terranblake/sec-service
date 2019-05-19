module.exports = {
    states: [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
        "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
        "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
    ],
    extensionElementStatuses: ['unprocessed', 'queued', 'processing', 'finished', 'failed'],
    taxonomyExtensionTypes: ['calculation', 'presentation', 'label', 'definition', 'instance'],
    filingTypes: ['10-K', '10-Q', '20-F', 'S-1', 'POS AM', 'S-1/A', '485BPOS', '10-K/A', '497', '10-Q/A', '40-F'],
    identifierPrefixes: ['us-gaap', 'srt', 'gaap'],
    identifierDocumentFlags: ['Statement', 'Disclosure'],
    dateTypes: ['instant', 'duration'],
    fetchLinks: {
        'sec': 'https://www.sec.gov/Archives/edgar/xbrlrss.all.xml',
    },
}