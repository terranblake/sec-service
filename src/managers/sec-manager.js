const moment = require('moment');
const Parser = require('rss-parser');

const { Filing, Company } = require('@postilion/models');

const { logger, metadata, parserOptions, enums } = require('@postilion/utils');
const { rss } = parserOptions;
const { rssFeeds } = enums;

class SecManager {
	async getLatestFilingFeed(ticker, source = 'sec') {
		let parser = new Parser(rss);

		// todo: fix how interfaces interact with eachother when
		// referencing results from a mongodb query
		const company = await Company.findOne({ ticker }).lean();
		if (!company) {
			throw new Error(`no company found with ticker ${ticker}`);
		}

		const rssUrl = rssFeeds[source].by_cik(company.refId);
		let feed = await parser.parseURL(rssUrl);

		let parsedRssEntries = [];
		for (let entry of feed.items) {
			const accessionNumber = entry.id.split('accession-number=')[1];

			const foundFiling = await Filing.findOne({ refId: accessionNumber });
			if (foundFiling) {
				logger.info(`skipping already parsed filing ${foundFiling._id} refId ${accessionNumber} company ${foundFiling.company}`);
				continue;
			}

			const filingMetadata = await metadata(Filing, ticker, accessionNumber);
			logger.info(`retrived metadata for filing with accession number ${accessionNumber} company ${company._id}`);

			if (!filingMetadata) {
				logger.error(`metadata for filing with accession number ${accessionNumber} returned null. this should be investigated company ${JSON.stringify(company)}`);
				continue;
			}
			
			const formattedRssEntry = {
				company: company._id,
				publishedAt: moment(entry.pubDate).format(),
				fiscalYearEnd: moment(filingMetadata.fiscalYearEnd, 'MMYY').format(),
				...filingMetadata
			}

			await Filing.create(formattedRssEntry);
		};

		return parsedRssEntries;
	}
}

module.exports = SecManager;