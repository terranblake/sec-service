
module.exports = (source, type, event) => ({
	// formats raw events and filters the correct
	// events into the correct handler for processing
	// based on the implementation, source framework
	// and the event contents themselves

	// this part will act as the middleware between
	// frameworks and the consumers of the events

	mongodb: {
		documentChange: mongodbChangeStreamHandler(source, type, event),
	},
	
}[source][type]);

function mongodbChangeStreamHandler(source, type, event) {
	console.log({ source, type, event });
}