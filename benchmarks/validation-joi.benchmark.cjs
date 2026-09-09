'use strict';

const fastify = require('fastify')();
const Joi = require('joi');
const { standardSchemaPlugin } = require('../dist/index.cjs');
const { listen } = require('./lib/listen.cjs');

fastify.register(standardSchemaPlugin);

const opts = {
  schema: {
    querystring: Joi.object({
      page: Joi.number().integer().min(1).max(100).default(1),
    }),
  },
};

fastify.after(() => {
  fastify.get('/', opts, (request, reply) => {
    reply.send({ page: request.query.page });
  });
});

listen(fastify);
