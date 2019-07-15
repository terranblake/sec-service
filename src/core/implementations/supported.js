module.exports = (value) => ({
	mongodb: require('./mongodb'),
}[value]);