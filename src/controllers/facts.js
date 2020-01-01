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

// todo: pre-compute yearly identifier trees and store them in redis for quick lookup
module.exports.getIdentifierTreeByTickerAndYear = async (ticker, roleName, year = moment().year(), quarter) => {
	const company = await Company.findOne({ ticker }).lean();
	if (!company) {
		return {};
	}

	const rootQuery = {
		'role.name': roleName,
		depth: 0,
		version: year
	};

	const rootIdentifiers = await Identifier.find(rootQuery).lean();
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
		
		const foundFact = await Fact.findOne({
			name: current.name,
			company: company._id,
			'date.year': year,
			'date.type': quarter ? 'quarter' : 'year',
			'date.quarter': quarter || '1'
		}).lean();

		if (!depths.includes(current.depth)) {
			depths.push(current.depth);
		}

		const children = await Identifier.find({
			// 'role.name': current.role.name,
			depth: current.depth + 1,
			parent: current.name,
			version: year
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
		depthEdges[depth] = graph.outEdges(depth).map(e => e.w);
	}

	do {
		const edge = toSearch.shift();
		const node = graph.node(edge.w);
		// if (node) {
			const depth = Object.keys(depthEdges).find(d => depthEdges[d].includes(edge.w));
			logger.info(`${depth} ${'\t'.repeat(depth)} ${edge.w} ${node && node.value || ''}`);
		// }

		edges = graph.outEdges(edge.w);
		toSearch.unshift(...edges);


	} while (toSearch.length);

	return graph;
}