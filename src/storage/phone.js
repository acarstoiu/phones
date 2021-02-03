'use strict';

const { serialize, deserialize } = require('v8');

const tools = require("../toolbox");
const { db } = require(".");
const { Colors, Types } = require("../model").phone;

module.exports = {
	create,
	retrieve,
	update,
	remove,
	listAll
};

const DB_KEY = "phn";

function mapToDatabase(phone) {
	phone.type = Types[phone.type];
	phone.color = Colors[phone.color];

	return {
		key: phone.id || tools.generateSafeId(),
		value: serialize(phone)
	};
}

function mapFromDatabase(key, value) {
	const phone = deserialize(value);
	phone.id = key;
	phone.type = Types.labelFor(phone.type);
	phone.color = Colors.labelFor(phone.color);

	return phone;
}

function create(phone) {
	const representation = mapToDatabase(phone);

	return new Promise((resolve, reject) => {
		db.hsetnx(DB_KEY, representation.key, representation.value, (error, result) => {
			if (error)
				reject(error);
			else if (!result)
				reject(new ReferenceError("Somehow the ID generation has failed to provide a unique value."));
			else resolve(representation.key);
		});
	});
}

function retrieve(phoneId) {
	return new Promise((resolve, reject) => {
		db.hget(DB_KEY, phoneId, (error, result) => {
			if (error)
				reject(error);
			else resolve(result ? mapFromDatabase(phoneId, result) : null);
		});
	});
}

function update(phone) {
	const representation = mapToDatabase(phone);

	return new Promise((resolve, reject) => {
		db.watch(DB_KEY, (error) => {
			if (error)
				return reject(error);

			db.hexists(DB_KEY, representation.key, (error, result) => {
				if (error || !result) {
					return db.unwatch(() => {
						if (error)
							reject(error);
						else resolve(false);
					});
				}

				db.multi()
					.hset(DB_KEY, representation.key, representation.value)
					.exec((error, results) => {
						if (!results)
							return resolve();

						if (error || results[0] instanceof Error)
							reject(error || results[0]);
						else resolve(true);
					});
			});
		});
	});
}

function remove(phoneId) {
	return new Promise((resolve, reject) => {
		db.hdel(DB_KEY, phoneId, (error, result) => {
			if (error)
				reject(error);
			else resolve(Boolean(result));
		});
	});
}

function listAll(batchSize, cursor) {
	const args = [cursor ? cursor : 0];
	if (batchSize)
		args.push('COUNT', batchSize);

	return new Promise((resolve, reject) => {
		db.hscan(DB_KEY, args, (error, result) => {
			if (error)
				return reject(error);

			let size = result[1].length / 2;
			const list = {
				items: new Array(size)
			};
			let i;
			for (i = 0; i < size; i++)
				list.items[i] = mapFromDatabase(result[1][2 * i].toString('ascii'), result[1][2 * i + 1]);

			i = Number(result[0]);
			if (i)
				list.nextBatch = i;

			resolve(list);
		});
	});
}
