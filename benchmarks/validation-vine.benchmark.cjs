'use strict';

const fastify = require('fastify')();
const vine = require('@vinejs/vine').default;
const { standardSchemaPlugin } = require('../dist/index.cjs');
const { listen } = require('./lib/listen.cjs');

fastify.register(standardSchemaPlugin);

const querySchema = vine.compile(
  vine.object({
    page: vine.number().min(1).max(100).optional(),
  }),
);

const opts = {
  schema: {
    querystring: querySchema,
  },
};

fastify.after(() => {
  fastify.get('/', opts, (request, reply) => {
    reply.send({ page: request.query.page });
  });
});

listen(fastify);
