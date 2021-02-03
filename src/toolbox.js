'use strict';

const { resolve } = require('path');
const { readdirSync } = require('fs');
const { randomFillSync } = require('crypto');
const { serialize, deserialize } = require('v8');

class Enumeration {
	constructor(values, ...labels) {
		if (typeof values !== 'function')
			throw new TypeError("A function providing the enumeration values was expected.");
		if (!labels.length)
			throw new TypeError("At least a label was expected.");

		const reverseMap = new Map();
		let i, value, label;
		for (i = 0; i < labels.length; i++) {
			label = String(labels[i]);
			value = values(label, i);
			if (reverseMap.has(value))
				throw new TypeError("The value for label '" + label + "' is repeated.");

			this[label] = value;
			reverseMap.set(value, label);
		}

		this.labelFor = value => reverseMap.get(value);
		this.labels = () => reverseMap.values();

		Object.freeze(this);
	}
}

class NumericEnumeration extends Enumeration {
	constructor(...labels) {
		super((_, i) => i, ...labels);
	}
}

function clone(obj) {
	if (typeof obj === 'object' && obj)
		return deserialize(serialize(obj));
}

const INDEX_FILENAME = "index.js";
const COMMONJS_MODULE_EXTENSION = /\.c?js$/;

function lazilyLoadSubmodules(container, directory) {
	if (!Object.isExtensible(container))
		throw new TypeError("The given container is sealed.");

	directory = resolve(directory);
	const entries = readdirSync(directory, { withFileTypes: true });

	let i = entries.length;
	while (i--) {
		if (!entries[i].isFile())
			continue;

		let name = entries[i].name;
		if (name !== INDEX_FILENAME && COMMONJS_MODULE_EXTENSION.test(name)) {
			name = name.slice(0, name.lastIndexOf('.'));
			if (name in container)
				throw new ReferenceError("'" + name + "' would be an ambiguous submodule reference within the given container.");

			/* jshint -W083 */
			Object.defineProperty(container, name, {
				enumerable: true,
				get: function() {
					return require(resolve(directory, name));
				}
			});
			/* jshint +W083 */
		}
	}
}

const DEFAULT_ID_LENGTH = 16;

function generateSafeId(length = DEFAULT_ID_LENGTH) {
	return randomFillSync(Buffer.allocUnsafe(length)).toString('base64url');
}

module.exports = {
	Enumeration,
	NumericEnumeration,
	clone,

	lazilyLoadSubmodules,

	generateSafeId
};

