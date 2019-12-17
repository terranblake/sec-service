const { readFile } = require('fs');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const { Graph } = require("@dagrejs/graphlib");

const facts = require('../models/facts');
const identifiers = require('../models/identifiers');
const filingDocuments = require('../models/filingDocuments');

const { logs, errors } = require('../utils/logging');
const { download } = require('../utils/raw-data-helpers')
const { formatContexts, formatFacts, formatUnits } = require('../utils/filing-document-helpers');
const { filingDocument: filingDocumentParserOptions } = require('../utils/parser-options');

const readFileAsync = promisify(readFile);
const parseStringAsync = promisify(parseString);

module.exports.parseFromFiling = async (filingId) => {
	const documents = await filingDocuments.model
		.find({ filing: filingId, type: 'instance' })
		.lean()
		.populate({ path: 'company' });
	let factIds = [];

	logs(`found ${documents.length} filingDocuments to crawl for facts`);

	for (let document of documents) {
		const { fileUrl, company, status, statusReason, _id } = document;
		let elements;

		if (status === 'crawling' || status === 'crawled') {
			errors(`skipping crawling filingDocument ${_id} for ${company._id} because filingDocument is being crawled or was already crawled`);
			continue;
		}

		// read from local archive if exists
		if (status === 'downloaded' && statusReason) {
			logs(`filingDocument ${_id} loaded from local archive since it has been downloaded company ${company} filing ${filingId}`);
			elements = await readFileAsync(statusReason);
		// otherwise download the document again
		} else {
			logs(`filingDocument ${_id} downloaded from source since it has not been downloaded company ${company} filing ${filingId}`);
			elements = await download(fileUrl);
		}

		elements = await parseStringAsync(elements, filingDocumentParserOptions);
		elements = elements["xbrli:xbrl"] || elements.xbrl;

		await filingDocuments.model.findOneAndUpdate({ _id: document._id }, { status: 'crawling' });

		// format units
		let rawUnits = elements["xbrli:unit"] || elements.unit;;
		validUnits = formatUnits(rawUnits);

		if (!validUnits || Array.isArray(validUnits) && !validUnits.length) {
			errors('no units returned from unit formatter. bailing!');
			return;
		}

		// todo: this probably won't work for every 
		let rawContexts = elements['xbrli:context'] || elements.context;
		let newContexts = await formatContexts(rawContexts);

		// format facts
		const newFacts = await formatFacts(elements, newContexts, validUnits, filingId, company);
		for (let fact of newFacts) {
			await facts.model.create(fact);
		}

		await filingDocuments.model.findOneAndUpdate({ _id: document._id }, { status: 'crawled' });
	}

	return factIds;
}

module.exports.getChildren = async (filing, identifierName, roleName) => {
	const rootIdentifiers = await identifiers.model.find({ depth: '0' }).lean();
	if (!rootIdentifiers) {
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
			filing
		}).lean();

		if (!depths.includes(current.depth)) {
			depths.push(current.depth);
		}

		const children = await identifiers.model.find({
			role: current.role,
			depth: current.depth + 1,
			parent: current.name
		}).lean();

		if (Object.keys(children).length) {
			graph.setNode(current.name, foundFact);
		}
		
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