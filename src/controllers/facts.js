const { Graph } = require("@dagrejs/graphlib");
const moment = require('moment');

const { Company, Fact, Identifier, FilingDocument } = require('@postilion/models');

const { crawlById: crawlFilingDocumentById } = require('./filing-documents');
const filingDocumentParsers = require('../utils/filing-document-parsers');

const { logger } = require('@postilion/utils');

module.exports.parseFromFiling = async (filingId) => {
	const documents = await FilingDocument
		.find({
			filing: filingId,
			type: { $in: Object.keys(filingDocumentParsers) }
		})
		.lean();

	logger.info(`found ${documents.length} filingDocuments to crawl for facts`);
	for (let document of documents) {
		await crawlFilingDocumentById(document._id);
	}

	return factIds;
}

// an object which defines identifiers from
// a specific role grouping that have more
// children synthetically appended to them
// to improve the context for a generic role
const appendages = {
	// identifier to link from
	IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments: {
		// original identifier
		from: {
			identifier: {
				'role.name': 'StatementOfIncome',
				'role.type': 'statement',
				'role.id': '124000',
				version: '2017'
			},
		},
		// target identifier
		to: {
			identifier: {
				name: 'InterestIncomeExpenseAfterProvisionForLoanLoss',
				'role.name': "StatementOfIncomeFirstAlternative",
				'role.type': "statement",
				'role.id': "124003",
				version: '2017',
			}
		}
	},
}

const appendageNames = Object.keys(appendages);

// todo: pre-compute yearly identifier trees and store them in redis for quick lookup
module.exports.getIdentifierTreeByTickerAndYear = async (ticker, roleName, year = moment().year(), quarter) => {
	const company = await Company.findOne({ ticker }).lean();
	if (!company) {
		return {};
	}

	// query with the role or group name, the
	// year and the very top level identifiers
	const rootQuery = {
		'role.name': roleName,
		depth: 0,
		version: year
	};

	const rootIdentifiers = await Identifier.find(rootQuery).lean();
	if (!rootIdentifiers.length) {
		return {};
	}

	// create a copy of the identifiers so we can pop
	// the entire array without destroying it because
	// we need it later on duh
	const searchable = Object.assign([], rootIdentifiers);
	const graph = new Graph();
	const depths = [];

	do {
		const current = searchable.pop();

		// set edge from depth to identifier name
		// to maintain easy access to the entire tree
		// with as little complexity
		graph.setEdge(current.depth, current.name);

		// find a fact with current.name and is
		// the correct date format requested
		const foundFact = await Fact.findOne({
			name: current.name,
			company: company._id,
			'date.year': year,
			'date.type': quarter ? 'quarter' : 'year',
			// only filter by quarter if the quarter is actually passed in
			// since year data isn't strict about the quarter that it starts in
			...quarter && { 'date.quarter': quarter } || undefined
		}).lean();

		// keep track of the depth nodes so we have
		// an index into each depth for later
		if (!depths.includes(current.depth)) {
			depths.push(current.depth);
		}

		let roleNames = [current.role.name];
		let roleDepths = [current.depth + 1];
		let parentIdentifiers = [current.name];

		if (appendageNames.includes(current.name)) {
			const appendage = appendages[current.name];

			// get the from identifier to make sure that this identifier actually exists
			const fromIdentifier = await Identifier.findOne({ ...appendage.from.identifier, name: current.name });
			if (!fromIdentifier) {
				logger.error(`unable to find appendage.from.identifier with name ${current.name}`);
				return {};
			}

			// get the to identifier to make sure we link to something real
			const toIdentifier = await Identifier.findOne(appendage.to.identifier);
			if (!toIdentifier) {
				logger.error(`unable to find appendage.to.identifier with name ${appendage.to.identifier.name}`);
				return {};
			}

			roleNames.push(toIdentifier.role.name);
			roleDepths.push(toIdentifier.depth);
			parentIdentifiers.push(toIdentifier.parent);
		}

		const children = await Identifier.find({
			'role.name': { $in: roleNames },
			depth: { $in: roleDepths },
			version: year,
			parent: { $in: parentIdentifiers },
		}).lean();

		graph.setNode(current.name, foundFact);

		for (let child of children) {
			graph.setEdge(current.name, child.name);
			searchable.push(child);
		}
	} while (searchable.length);

	// create edge between all root identifiers
	// and a single named node. quick access to all
	// related members and structured af
	for (let identifier of rootIdentifiers) {
		graph.setNode(identifier.name, identifier);
		graph.setEdge('root', identifier.name);
	}

	let edges = graph.outEdges('root');
	let toSearch = edges;

	const depthEdges = {};
	for (let depth of depths) {
		depthEdges[depth] = graph.outEdges(depth).map(e => e.w);
	}

	do {
		const edge = toSearch.shift();
		const node = graph.node(edge.w);

		// comment out to print all nodes
		if (node) {
			const depth = Object.keys(depthEdges).find(d => depthEdges[d].includes(edge.w));

			logger.info(`${depth} ${'\t'.repeat(depth)} ${edge.w} ${node && node.value || ''}`);

			// flattened
			// logger.info(`${edge.w} ${node && node.value || ''}`);
		}

		edges = graph.outEdges(edge.w);
		toSearch.unshift(...edges);


	} while (toSearch.length);

	return graph;
}