'use strict';

const config = require("./config.json");
const model = require("./model");

const fastify = require('fastify')({
	bodyLimit: config.service.maxRequestBodyLength,
	trustProxy: true,
	exposeHeadRoutes: true,

	ajv: {
		customOptions: {
			removeAdditional: true,
			useDefaults: false
		}
	},

	logger: {
		level: config.service.logLevel
	}
});

fastify.register(require("./storage"), config.redis);

fastify.register(async function(context) {

	fastify.post("/", {
		schema: {
			body: model.phone.inboundSchema
		}
	}, async function(req, res) {
		let id = await context.storage.phone.create(req.body);
		res.code(204).header("Location", './' + id);
	});

	fastify.get("/:id", {
		schema: {
			response: {
				'2xx': model.phone.outboundSchema
			}
		}
	}, async function(req, res) {
		let phone = await context.storage.phone.retrieve(req.params.id);
		if (phone)
			return phone;

		res.code(404).send(new ReferenceError("No such entity."));
	});

	fastify.put("/:id", {
		schema: {
			body: model.phone.inboundSchema,
		}
	}, async function(req, res) {
		let phone = req.body;
		phone.id = req.params.id;

		switch (await context.storage.phone.update(phone)) {
			case true:
				res.code(204);
				break;

			case false:
				res.code(404).send(new ReferenceError("No such entity."));
				break;

			default:
				res.code(409).send(new Error("Please try again."));
		}
	});

	fastify.delete("/:id", async function(req, res) {
		if (await context.storage.phone.remove(req.params.id))
			res.code(204);
		else res.code(404).send(new ReferenceError("No such entity."));
	});

	fastify.get("/", {
		schema: {
			response: {
				'2xx': model.phone.outboundCollectionSchema
			},
			query: {
				batch: {
					type: "integer"
				},
				size: {
					type: "integer"
				}
			}
		}
	}, async function(req) {
		let size = req.query.size;
		if (!size || size < 1 || size > config.service.maxListingBatchSize)
			size = config.service.maxListingBatchSize;

		return context.storage.phone.listAll(size, req.query.batch);
	});

}, { prefix: "/phone" });

module.exports = fastify;