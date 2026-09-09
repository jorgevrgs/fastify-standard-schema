'use strict';

const fastify = require('fastify')();
const yup = require('yup');
const { standardSchemaPlugin } = require('../dist/index.cjs');
const { listen } = require('./lib/listen.cjs');

fastify.register(standardSchemaPlugin);

const opts = {
  schema: {
    response: {
      200: yup.object({
        hello: yup.string().required(),
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
