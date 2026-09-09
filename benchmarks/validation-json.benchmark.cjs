'use strict';

const fastify = require('fastify')();
const { listen } = require('./lib/listen.cjs');

const opts = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        page: {
          type: 'integer',
          default: 1,
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
};

fastify.get('/', opts, (request, reply) => {
  reply.send({ page: request.query.page });
});

listen(fastify);
