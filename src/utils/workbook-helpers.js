module.exports.formatters = {
	2019: (extensionType, identifier) => {
		switch (extensionType) {
            // has most of the important rawIdentifiers
            case 'calculation':
                const extendedLinkRole = identifier['extended link role'];
                const [roleType, roleName] = extendedLinkRole.split('/').slice(-2);

                return {
                    documentType: extensionType,
                    extendedLinkRole,
                    role: {
                        type: roleType,
                        name: roleName
                    },
                    definition: identifier['definition'],
                    prefix: identifier['prefix'],
                    name: identifier['name'],
                    label: identifier['label'],
                    depth: identifier['depth'],
                    order: identifier['order'],
                    weight: identifier['weight'],
                    parent: identifier['parent'],
                    itemType: identifier['item type'] || 'monetaryItemType'
                };
            // in depth definitions and supplementary information
            //  about each identifier e.g. documentation, type, periodType, etc.
            case 'elements':
                unitType = identifier.type && identifier.type.split(':')[1];
                // identifier.unitType = unitType && unitType.toLowerCase();

                // todo: validate the correct unitType is being found and
                //          not some random one that we don't need

                identifier.documentType = extensionType,
                identifier.abstract = identifier.abstract === 'true';
                identifier.itemType = identifier['item type'] || 'monetaryItemType'

                for (property in identifier) {
                    if (!Object.keys(identifierSchema).includes(property)) {
                        delete identifier[property]
                    }
                }

                return identifier;
        }
	},
	2018: (extensionType, identifier) => {
		switch (extensionType) {
            // has most of the important rawIdentifiers
            case 'calculation':
                // const extendedLinkRole = identifier['extended link role'];
                // const [roleType, roleName] = extendedLinkRole.split('/').slice(-2);

                // return {
                //     documentType: extensionType,
                //     extendedLinkRole: identifier['extended link role'],
                //     role: {
                //         type: roleType,
                //         name: roleName
                //     },
                //     definition: identifier['definition'],
                //     prefix: identifier['prefix'],
                //     name: identifier['name'],
                //     label: identifier['label'],
                //     depth: identifier['depth'],
                //     order: identifier['order'],
                //     weight: identifier['weight'],
                //     parent: identifier['parent'],
                //     itemType: identifier['item type'] || 'monetaryItemType'
                // };
            // in depth definitions and supplementary information
            //  about each identifier e.g. documentation, type, periodType, etc.
            case 'elements':
                // unitType = identifier.type && identifier.type.split(':')[1];
                // // identifier.unitType = unitType && unitType.toLowerCase();

                // // todo: validate the correct unitType is being found and
                // //          not some random one that we don't need

                // identifier.documentType = extensionType,
                // identifier.abstract = identifier.abstract === 'true';
                // identifier.itemType = identifier['item type'] || 'monetaryItemType'

                // for (property in identifier) {
                //     if (!Object.keys(identifierSchema).includes(property)) {
                //         delete identifier[property]
                //     }
                // }

                return identifier;
        }
	}
}