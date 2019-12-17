const Moment = require('moment');
const { extendMoment } = require('moment-range');

const moment = extendMoment(Moment);

let quarters = [
	// quarter 1 usually spans January 1-March 31;
	[moment("2019-01-01T00:00:00.000").year(1990), moment("2019-03-31T23:59:59.999").year(1990)],
	// quarter 2 usually spans April 1-June 30;
	[moment("2019-04-01T00:00:00.000").year(1990), moment("2019-06-30T23:59:59.999").year(1990)],
	// quarter 3 usually spans July 1-September 30;
	[moment("2019-07-01T00:00:00.000").year(1990), moment("2019-09-30T23:59:59.999").year(1990)],
	// quarter 4 usually spans October 1-December 31
	[moment("2019-10-01T00:00:00.000").year(1990), moment("2019-12-31T23:59:59.999").year(1990)],
]

module.exports.getMostIntersectedRange = (inputRange, ranges) => {
	const overlaps = {};
	for (let r in ranges) {
		const [start, end] = ranges[r];
		const indexRange = moment.range([start.year(inputRange.start.year()), end.year(inputRange.end.year())]);

		if (indexRange.overlaps(inputRange)) {
			const intersection = indexRange.intersect(inputRange);
			overlaps[Number(r) + 1] = Math.abs(intersection.start.diff(intersection.end, 'days'));
		}
	}

	const result = Object.keys(overlaps).reduce((acc, curr) => {
		// handle first undefined
		if (!overlaps[acc]) {
			return curr;
		}

		return overlaps[curr] > overlaps[acc] ? curr : acc;
	}, -1);

	if (result === -1) {
		process.exit();
	}

	return result;
}

module.exports.getDateType = (value) => {
	if (!value.startDate) {
		return 'instant';
	}

	const monthsInRange = Math.abs(moment(value.startDate).diff(moment(value.endDate), 'months'));

	if (monthsInRange < 2) {
		return 'month';
	}

	if (monthsInRange < 5) {
		return 'quarter';
	}

	return 'year';
}

module.exports.getYearReported = (value, dateType) => {
	if (!dateType) {
		dateType = this.getDateType(value);
	}

	if (dateType === 'instant') {
		return moment(value).year();
	}

	let { startDate, endDate } = value;
	startDate = moment(startDate);
	endDate = moment(endDate);

	// start and end date are in the same year
	const differentYears = startDate.year() !== endDate.year();
	if (!differentYears) {
		return startDate.year();
	}

	// get start date months to end of year
	const startYear = moment().year(startDate.year()).endOf('year');
	const daysInStartYear = startYear.diff(startDate, 'days');

	// get end date months to beginning of year
	const endYear = moment().year(endDate.year()).startOf('year');
	const daysInEndYear = endDate.diff(endYear, 'days');

	// return the year of whichever one had the
	// most days from the range
	return daysInStartYear > daysInEndYear
		? startDate.year()
		: endDate.year();
}

module.exports.getQuarterReported = (value, dateType) => {
	if (!dateType) {
		dateType = this.getDateType(value);
	}

	if (dateType === 'instant') {
		return moment(value).quarter();
	}

	if (dateType === 'year') {
		return moment(value.startDate).quarter();
	}

	const reportedRange = moment.range([moment(value.startDate), moment(value.endDate)]);
	return Number(this.getMostIntersectedRange(reportedRange, quarters));
}