const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/postilion');
mongoose.connection.on('connected', () => {
	require('./src/service');
	require('./src/rest');
});