const { Graph } = require("@dagrejs/graphlib");
const moment = require('moment');

const { Company, Fact, Identifier } = require('@postilion/models');
const { logger } = require('@postilion/utils');

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
	}
};

const appendageNames = Object.keys(appendages);

// todo: pre-compute yearly identifier trees and store them in redis for quick lookup
module.exports.getIdentifierTreeByTickerAndYear = async (ticker, roleName, year = moment().year(), quarter) => {
	const company = await Company.findOne({ ticker }).lean();
	if (!company) {
		logger.error(`unable to find company with ticker ${ticker}. please try again`);
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
		logger.error(`unable to find root identifiers using the query ${JSON.stringify(rootQuery)}. please try again`);
		return {};
	}

	// create a copy of the identifiers so we can pop
	// the entire array without destroying it because
	// we need it later on duh
	const searchable = Object.assign([], rootIdentifiers);
	const graph = new Graph();
	const depths = [];
	let currentDepth;

	do {
		const current = searchable.pop();

		// set edge from depth to identifier name
		// to maintain easy access to the entire tree
		// with as little complexity
		currentDepth = current.depth || currentDepth;
		graph.setEdge(currentDepth, current.name);

		// find a fact with current.name and is
		// the correct date format requested
		let factQuery = {
			name: current.name,
			company: company._id,
			'date.year': year,
			'date.type': quarter ? 'quarter' : 'year',
			// only filter by quarter if the quarter is actually passed in
			// since year data isn't strict about the quarter that it starts in
			...quarter && { 'date.quarter': quarter } || undefined,
		};

		let foundFact = await Fact.findOne(factQuery).sort({ 'segment': 1 }).lean();

		if (!foundFact) {
			// todo: search the definition linkbase for identifiers which are linked
			// from the current identifier to any other identifier. extract identifier
			// data from them to put in the children nodes query below
			const definitionArc = await Link.findOne({
				filing,
				company,
				type: 'arc',
				documentType: 'definition',
				// todo: add to/from filters
				'from.prefix': current.prefix,
				'from.name': current.name
			});

			factQuery.name = definitionArc.name;
			foundFact = await Fact.findOne(factQuery).sort({ 'segment': 1 }).lean();

			// override the name of the fact to the identifier that
			// we originally expected to keep the integrity of the tree
			foundFact.name = current.name;
		}

		// keep track of the depth nodes so we have
		// an index into each depth for later
		if (!depths.includes(current.depth)) {
			depths.push(current.depth);
		}

		let roleNames = [current.role.name];
		let roleDepths = [current.depth + 1];
		let parentIdentifiers = [current.name];

		// if no fact is found, maybe we should check if there are
		// links which would point us to a fact with the correct name 🤔

		// check if an arc of the same documentType exists
		// and include the result locators from field

		// check if we've defined a synthetic link between
		// identifiers, typically across roles, coming from
		// this identifier
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

			// include the linked identifier in the query
			// for children so we get everything we need
			roleNames.push(toIdentifier.role.name);
			roleDepths.push(toIdentifier.depth);
			parentIdentifiers.push(toIdentifier.parent);
		}

		// get all children of the current identifier
		// or is a child of the identifier linked into the tree
		const children = await Identifier.find({
			'role.name': { $in: roleNames },
			// temp: disabling this while testing
			// calc/def links between identifiers
			// depth: { $in: roleDepths },
			version: year,
			parent: { $in: parentIdentifiers },
		}).lean();

		graph.setNode(current.name, foundFact);

		// get all links from the current identifier
		// to another identifier which modifies the
		// original calculation linkbase 
		const calculationArcs = await Link.find({
			filing,
			company,
			type: 'arc',
			documentType: 'calculation',
			// we only want arcs from the current identifier
			// to the potentially unknown identifier name
			'from.prefix': current.prefix,
			'from.name': current.name,
			// dont include a to parameter because we want
			// all calculation arcs that were created for linking
		}).map(l => {
			// map the current identifier onto the calculation arcs
			// to absorb any differences and normalize the next iteration
			// through the graph process
			return {
				name: l.name,
				depth: current.depth + 1,
				...current
			}
		});

		for (let child of [...children, ...calculationArcs]) {
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

	let financialValues = {};

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

			if (process.env.NODE_ENV !== 'production') {
				logger.info(`${depth} ${'\t'.repeat(depth)} ${edge.w} ${node.value || ''}`);
			} else {
				// flattened
				logger.info(`${edge.w} ${node && node.value || ''}`);
			}

			financialValues[edge.w] = node.value;
		}

		edges = graph.outEdges(edge.w);
		toSearch.unshift(...edges);


	} while (toSearch.length);

	return financialValues;
}