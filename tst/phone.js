'use strict';

const assert = require('assert').strict;

const { clone } = require("../src/toolbox");

const DB_KEY = "phn";

const ONE_PHONE = {
	type: "MOBILE",
	color: "BLACK",
	serialNo: "one",
	metadata: { a: "secret" }
};

const ANOTHER_PHONE = {
	type: "LANDLINE",
	color: "BLACK",
	serialNo: "another",
	metadata: { no: "secret" }
};

function extractIdFromLocationHeader(res) {
	const location = res.headers.location;
	if (!location)
		return;

	return location.slice(location.lastIndexOf('/') + 1);
}

describe("Phone entities management", function() {
	this.slow(200);

	function cleanUp() {
		return new Promise((resolve, reject) => {
			this.db.del(DB_KEY, (error) => {
				if (error)
					reject(error);
				else resolve();
			});
		});
	}

	function count(db) {
		return new Promise((resolve, reject) => {
			db.hlen(DB_KEY, (error, result) => {
				if (error)
					reject(error);
				else resolve(result);
			});
		});
	}

	function exists(db, id) {
		return new Promise((resolve, reject) => {
			db.hexists(DB_KEY, id, (error, result) => {
				if (error)
					reject(error);
				else resolve(result);
			});
		});
	}

	describe("Basic operations", function() {
		before("clear the database collection", cleanUp);
		after("clear the database collection", cleanUp);

		specify("creation", async function() {
			const res = await this.app.inject({
				method: 'POST',
				url: "/phone",
				payload: ONE_PHONE
			});
			assert.equal(res.statusCode, 204);

			this.id = extractIdFromLocationHeader(res);
			assert.ok(await exists(this.db, this.id));
		});

		specify("update non-existing", async function() {
			const res = await this.app.inject({
				method: 'PUT',
				url: "/phone/" + this.id + "_",
				payload: ONE_PHONE
			});

			assert.equal(res.statusCode, 404);
			assert.equal(await count(this.db), 1);
		});

		specify("update", async function() {
			const modified = clone(ONE_PHONE);
			modified.metadata.xyz = true;
			modified.color = "GREEN";

			let res = await this.app.inject({
				method: 'PUT',
				url: "/phone/" + this.id,
				payload: modified
			});

			assert.equal(res.statusCode, 204);
			assert.equal(await count(this.db), 1);

			res = await this.app.inject({
				method: 'GET',
				url: "/phone/" + this.id
			});

			assert.equal(res.statusCode, 200);
			modified.id = this.id;
			assert.deepEqual(res.json(), modified);
		});

		specify("get non-existing", async function() {
			const res = await this.app.inject({
				method: 'GET',
				url: "/phone/" + this.id + "_"
			});

			assert.equal(res.statusCode, 404);
		});

		specify("delete non-existing", async function() {
			const res = await this.app.inject({
				method: 'DELETE',
				url: "/phone/" + this.id + "_"
			});

			assert.equal(res.statusCode, 404);
			assert.equal(await count(this.db), 1);
		});

		specify("delete", async function() {
			const res = await this.app.inject({
				method: 'DELETE',
				url: "/phone/" + this.id
			});

			assert.equal(res.statusCode, 204);
			assert.ok(!await exists(this.db, this.id));
		});
	});

	describe("Listing", function() {
		beforeEach("clear the database collection", cleanUp);
		after("clear the database collection", cleanUp);

		specify("two phones", async function() {
			let res = await this.app.inject({
				method: 'POST',
				url: "/phone",
				payload: ONE_PHONE
			});
			assert.equal(res.statusCode, 204);
			const one = clone(ONE_PHONE);
			one.id = extractIdFromLocationHeader(res);

			res = await this.app.inject({
				method: 'POST',
				url: "/phone",
				payload: ANOTHER_PHONE
			});
			assert.equal(res.statusCode, 204);
			const another = clone(ANOTHER_PHONE);
			another.id = extractIdFromLocationHeader(res);

			res = await this.app.inject({
				method: 'GET',
				url: "/phone"
			});
			assert.equal(res.statusCode, 200);

			const list = res.json();
			assert.equal(list.nextBatch, undefined, "no batches, actually!");

			let i = list.items.length;
			assert.equal(i, 2);
			while (i--)
				if (list.items[i].id === one.id)
					assert.deepEqual(list.items[i], one);
				else assert.deepEqual(list.items[i], another);
		});

		specify("many phones", async function() {
			const COUNT = 100;
			const BATCH_SIZE = 10;

			this.timeout((COUNT + Math.ceil(COUNT / BATCH_SIZE)) * 100);

			const inserted = new Set();
			let i = COUNT, res;
			while (i--) {
				res = await this.app.inject({
					method: 'POST',
					url: "/phone",
					payload: ANOTHER_PHONE
				});
				assert.equal(res.statusCode, 204);
				inserted.add(extractIdFromLocationHeader(res));
			}

			let queryParams = {
				size: BATCH_SIZE
			};
			do {
				res = await this.app.inject({
					method: 'GET',
					url: "/phone",
					query: queryParams
				});
				assert.equal(res.statusCode, 200);

				res = res.json();
				res.items.forEach((phone) => {
					assert.ok(inserted.delete(phone.id));
				});

				queryParams.batch = res.nextBatch;
			} while (queryParams.batch);

			assert.equal(inserted.size, 0);
		});
	});
});
