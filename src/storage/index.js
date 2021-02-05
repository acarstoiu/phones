'use strict';

const redis = require('redis');

require("../toolbox").lazilyLoadSubmodules(exports, __dirname);
exports[Symbol.for('shutdown')] = shutDown;

module.exports = setUp;

function connectionRetryDelay({ attempt, timesConnected, totalRetryTime }) {
	if (attempt > 3 + Math.max(timesConnected, 5))
		return;

	return attempt === 1 ? 100 : totalRetryTime / (attempt - 1) * 2;
}

function setUp(context, config) {
	context.decorate('storage', exports);

	return new Promise((resolve, reject) => {
		let logger = context.log.child({ component: "storage" });

		let pending = true;
		config.retry_strategy = connectionRetryDelay;
		let db = redis.createClient(config);
		db.on('error', (error) => {
			if (pending) {
				reject(error);
				pending = false;
			}
			else logger.error(error, "Unable to reconnect to the indicated Redis database.");
		});
		db.on('warning', (message) => {
			logger.warn("Warning about the Redis database:\n\t" + message);
		});
		db.on('end', () => {
			logger.debug("Connection to the Redis database was closed.");
		});
		db.on('ready', () => {
			if (pending) {
				resolve();
				pending = false;
			}
		});

		setUp.db = db;
	});
}
setUp[Symbol.for('skip-override')] = true;

function shutDown() {
	return new Promise((resolve) => {
		setUp.db.end(true);
		setUp.db.stream.on('close', resolve);
	});
}
