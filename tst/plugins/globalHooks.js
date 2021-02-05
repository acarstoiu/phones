'use strict';

const redis = require('redis');
const config = require("../config.json").redis;

config.retry_strategy = ({ attempt, timesConnected }) => {
	if (timesConnected || attempt > 3)
		return;

	return 500;
};

exports.mochaHooks = {
	beforeAll() {
		this.app = require("../../src/fastify-app");

		return Promise.all([
			this.app.ready(),
			new Promise((resolve, reject) => {
				this.db = redis.createClient(config);
				this.db.on('ready', resolve);
				this.db.on('error', reject);
			})
		]);
	},

	afterAll() {
		return Promise.allSettled([
			this.app.storage[Symbol.for('shutdown')](),
			new Promise((resolve) => {
				this.db.end(true);
				this.db.stream.on('close', resolve);
			})
		]);
	}
};

