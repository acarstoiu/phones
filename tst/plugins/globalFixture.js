'use strict';

const fs = require('fs');
const { resolve } = require('path');

const CONFIG_FILE = "config.json";

exports.mochaGlobalSetup = function() {
	const testConfig = resolve(__dirname, "..", CONFIG_FILE);

	this.normalConfig = resolve(__dirname, "../../src", CONFIG_FILE);
	this.savedConfig = this.normalConfig + ".$" + process.pid;

	fs.renameSync(this.normalConfig, this.savedConfig);
	fs.copyFileSync(testConfig, this.normalConfig);
};

exports.mochaGlobalTeardown = function() {
	fs.renameSync(this.savedConfig, this.normalConfig);
};