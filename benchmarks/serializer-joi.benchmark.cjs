'use strict';

const fastify = require('fastify')();
const Joi = require('joi');
const { standardSchemaPlugin } = require('../dist/index.cjs');
const { listen } = require('./lib/listen.cjs');

fastify.register(standardSchemaPlugin);

const opts = {
  schema: {
    response: {
      200: Joi.object({
        hello: Joi.string().required(),
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
