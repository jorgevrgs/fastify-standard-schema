'use strict';

const fastify = require('fastify')();
const { number, object } = require('zod/v4');
const { standardSchemaPlugin } = require('../dist/index.cjs');
const { listen } = require('./lib/listen.cjs');

fastify.register(standardSchemaPlugin);

const opts = {
  schema: {
    querystring: object({
      page: number().int().gte(1).lte(100).optional().default(1),
    }),
  },
};

fastify.after(() => {
  fastify.get('/', opts, (request, reply) => {
    reply.send({ page: request.query.page });
  });
});

listen(fastify);
