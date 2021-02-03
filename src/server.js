'use strict';

const app = require("./fastify-app");
const { attachment } = require("./config.json");

(async () => {
	try {
		await app.listen(attachment);
	}
	catch (e) {
		app.log.fatal("The service cannot be started.");
		throw e;
	}
	
	app.log.info("The service is up and running.");
})();