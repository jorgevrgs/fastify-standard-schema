'use strict';

const fastify = require('fastify')();
const { listen } = require('./lib/listen.cjs');

const opts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
        },
      },
    },
  },
};

fastify.get('/', opts, (_request, reply) => {
  reply.send({ hello: 'world' });
});

listen(fastify);
