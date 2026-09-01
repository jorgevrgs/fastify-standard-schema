'use strict';

const fastify = require('fastify')();
const { object, string } = require('zod/v4');
const { standardSchemaPlugin } = require('../dist/index.cjs');
const { listen } = require('./lib/listen.cjs');

fastify.register(standardSchemaPlugin);

const opts = {
  schema: {
    response: {
      200: object({
        hello: string(),
      }),
    },
  },
};

fastify.after(() => {
  fastify.get('/', opts, (_request, reply) => {
    reply.send({ hello: 'world' });
  });
});

listen(fastify);
