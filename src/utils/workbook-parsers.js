const { Identifier } = require('@postilion/models');

const { filter, keys, map, values, some, reduce } = require('lodash');
const { logger } = require('@postilion/utils');

const extractDefitionObjectFromString = (definition) => {
    definition = definition
        && definition.split('-')
        || [];
    return {
        id: definition[0].trim(),
        flag: definition[1].trim(),
        context: definition[2].trim(),
    };
}

const inlineRoleNameVariant = (unformattedIdentifiers, documentType, version) => {
    return map(unformattedIdentifiers, (identifier) => {
        switch (documentType) {
            case 'calculation':
                const extendedLinkRole = identifier['extended link role'];
                const [type, name] = extendedLinkRole.split('/').slice(-2);
                const { id } = extractDefitionObjectFromString(identifier.definition);

                return {
                    ...identifier,
                    documentType,
                    extendedLinkRole,
                    itemType: identifier['item type'] || 'monetaryItemType',
                    role: {
                        type,
                        name,
                        id
                    },
                    version,
                }
            case 'elements':
            case 'schema':
            case 'presentation':
            case 'label':
            default:
                throw new Error(`the identifier from linkbase type ${documentType} is not supported for version ${version}`);
        }
    });
}

const unmappedRoleNameVariant = (unformattedIdentifiers, documentType, version) => {
    let roleType, roleName, roleId, extendedLinkRole, definition;

    return map(unformattedIdentifiers, (identifier) => {
        const { name, prefix } = identifier;

        if (prefix === 'LinkRole') {
            logger.info(`extracting linkrole line name ${name}`);
            [roleType, roleName] = name.split('/').slice(-2);
            extendedLinkRole = name;
            return;
        }

        if (prefix === 'Definition') {
            logger.info(`skipping definition line name ${name}`);
            definition = name;
            ({ id: roleId } = extractDefitionObjectFromString(definition));
            return;
        }

        // skip column naming row (each item in the row is the s)
        if (filter(keys(identifier), i => identifier[i] === i).length) {
            return;
        }

        switch (documentType) {
            case 'calculation':
                return {
                    ...identifier,
                    documentType,
                    definition,
                    extendedLinkRole,
                    role: {
                        type: roleType,
                        name: roleName,
                        id: roleId
                    },
                    version,
                }
            case 'elements':
            case 'schema':
            case 'presentation':
            case 'label':
            default:
                throw new Error(`the identifier from linkbase type ${documentType} is not supported for version ${version}`);
        }
    });
}

const mappedRoleNameVariant = (unformattedIdentifiers, documentType, version) => {
    let roleType, roleName, roleId, extendedLinkRole, definition;

    const identifierFields = Object.keys(Identifier.schema.obj);
    let mapping = {};

    return map(unformattedIdentifiers, (identifier) => {
        let { LinkRole } = identifier;

        if (LinkRole === 'Definition') {
            let name = Object.keys(identifier).find(k => !['__rowNumb__', 'LinkRole'].includes(k));

            logger.info(`extracting linkrole line name ${name}`);
            [roleType, roleName] = name.split('/').slice(-2);
            extendedLinkRole = name;

            definition = identifier[name];
            ({ id: roleId } = extractDefitionObjectFromString(definition));

            // go to the next row
            return;
        }

        // skip column naming row (each item in the row is the s)
        if (some(values(identifier), i => identifierFields.includes(i))) {
            mapping = reduce(keys(identifier), (acc, curr) => {
                const key = identifier[curr];
                if (identifierFields.includes(key)) {
                    acc[curr] = key;
                }
                return acc;
            }, {});

            // go to the next row
            return;
        }

        if (!keys(mapping).length) {
            throw new Error('mapping failed to populate. bailing on workbook parsing!');
        }

        switch (documentType) {
            case 'calculation':
                return reduce(keys(identifier), (acc, curr) => {
                    if (mapping[curr]) {
                        acc[mapping[curr]] = identifier[curr];
                    }

                    return acc;
                }, {
                    documentType,
                    definition,
                    extendedLinkRole,
                    role: {
                        name: roleName,
                        type: roleType,
                        id: roleId
                    }
                });
            case 'elements':
            case 'schema':
            case 'presentation':
            case 'label':
            default:
                throw new Error(`the identifier from linkbase type ${documentType} is not supported for version ${version}`);
        }
    });
}

module.exports = {
    2019: inlineRoleNameVariant,
    2018: unmappedRoleNameVariant,
    2017: unmappedRoleNameVariant,
    // todo: fix role name and type resolution for older taxonomy trees
    // 2016: mappedRoleNameVariant,
    // 2015: mappedRoleNameVariant,
}