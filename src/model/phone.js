'use strict';

const { NumericEnumeration, clone } = require("../toolbox");

const Colors = new NumericEnumeration('WHITE', 'BLACK', 'BEIGE', 'ROSE', 'GREEN');
const Types = new NumericEnumeration('MOBILE', 'LANDLINE');

const inboundSchema = {
	//	'$schema': "http://json-schema.org/draft/2019-09/schema#",

	title: "Phone",
	type: "object",
	properties: {
		serialNo: {
			type: "string",
			pattern: "^[a-zA-Z1-9][-a-zA-Z0-9_:.]*$"
		},
		type: {
			type: "string",
			enum: Array.from(Types.labels())
		},
		color: {
			type: "string",
			enum: Array.from(Colors.labels())
		},
		metadata: {
			type: "object",
			minProperties: 1,
			additionalProperties: true
		}
	},
	additionalProperties: false,
	required: ["serialNo", "type", "color"]
};

const outboundSchema = clone(inboundSchema);
outboundSchema.properties.id = {
	type: "string",
	readOnly: true
};
outboundSchema.required.push("id");

module.exports = {
	inboundSchema,
	outboundSchema,

	outboundCollectionSchema: {
		title: "List of phones (partial)",
		type: "object",
		properties: {
			nextBatch: {
				type: "integer",
				readOnly: true
			},
			items: {
				type: "array",
				items: outboundSchema,
				minItems: 1
			}
		}
	},

	Colors,
	Types,
};
