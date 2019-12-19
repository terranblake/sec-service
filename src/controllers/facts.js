const { Graph } = require("@dagrejs/graphlib");
const moment = require('moment');

const companies = require('../models/companies');
const facts = require('../models/facts');
const identifiers = require('../models/identifiers');
const filingDocuments = require('../models/filingDocuments');

const { crawlById: crawlFilingDocumentById } = require('../controllers/filingDocuments');
const filingDocumentParsers = require('../utils/filing-document-parsers');

const { logs } = require('../utils/logging');

module.exports.parseFromFiling = async (filingId) => {
	const documents = await filingDocuments.model
		.find({
			filing: filingId,
			type: { $in: Object.keys(filingDocumentParsers) }
		})
		.lean();

	logs(`found ${documents.length} filingDocuments to crawl for facts`);
	for (let document of documents) {
		await crawlFilingDocumentById(document._id);
	}

	return factIds;
}

module.exports.getChildren = async (ticker, roleName, year = moment().year()) => {
	const rootQuery = {
		'role.name': roleName,
		depth: 0
	};

	const company = await companies.model.findOne({ ticker }).lean();
	if (!company) {
		return {};
	}

	const rootIdentifiers = await identifiers.model.find(rootQuery).lean();
	if (!rootIdentifiers.length) {
		return {};
	}

	const searchable = Object.assign([], rootIdentifiers);
	const graph = new Graph();
	const depths = [];

	do {
		const current = searchable.pop();

		// set edge from depth to identifier name
		graph.setEdge(current.depth, current.name);
		
		const foundFact = await facts.model.findOne({
			name: current.name,
			company: company._id,
			'date.year': year,
		}).lean();

		if (!depths.includes(current.depth)) {
			depths.push(current.depth);
		}

		const children = await identifiers.model.find({
			'role.name': current.role.name,
			depth: current.depth + 1,
			parent: current.name
		}).lean();

		graph.setNode(current.name, foundFact);
		
		for (let child of children) {
			graph.setEdge(current.name, child.name);
			searchable.push(child);
		}
	} while (searchable.length);

	for (let identifier of rootIdentifiers) {
		graph.setNode(identifier.name, identifier);
		graph.setEdge('root', identifier.name);
	}

	let edges = graph.outEdges('root');
	let toSearch = edges;

	const depthEdges = {};
	for (let depth of depths) {
		if (depth === 6) {
			logs(depth);
		}

		depthEdges[depth] = graph.outEdges(depth).map(e => e.w);
	}

	do {
		const edge = toSearch.shift();
		const node = graph.node(edge.w);
		if (node) {
			const depth = Object.keys(depthEdges).find(d => depthEdges[d].includes(edge.w));
			logs(`${depth} ${'\t'.repeat(depth)} ${edge.w} ${node && node.value || ''}`);
		}

		edges = graph.outEdges(edge.w);
		toSearch.unshift(...edges);


	} while (toSearch.length);

	return graph;
}