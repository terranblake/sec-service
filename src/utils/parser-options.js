module.exports = {
    rss: {
        customFields: {
            feed: ['link', 'extendedDescription'],
            item: [['edgar:xbrlFiling', 'filing']],
        }
    },
    taxonomyExtension: {
        tagNameProcessors: [
            // function (name) {
            //     console.log('tagNameProcessors', name);
            //     return name;
            // }
        ],
        attrNameProcessors: [
            // function (name) {
            //     console.log('attrNameProcessors', name);
            //     return name;
            // }
        ],
        valueProcessors: [
            // function (name) {
            //     console.log('valueProcessors', name);
            //     return name;
            // }
        ],
        attrValueProcessors: [
            // function (name) {
            //     console.log('attrValueProcessors', name);
            //     return name;
            // }
        ]
    }
}