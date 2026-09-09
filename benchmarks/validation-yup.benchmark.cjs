'use strict';

const fastify = require('fastify')();
const yup = require('yup');
const { standardSchemaPlugin } = require('../dist/index.cjs');
const { listen } = require('./lib/listen.cjs');

fastify.register(standardSchemaPlugin);

const opts = {
  schema: {
    querystring: yup.object({
      page: yup.number().integer().min(1).max(100).default(1),
    }),
  },
};

fastify.after(() => {
  fastify.get('/', opts, (request, reply) => {
    reply.send({ page: request.query.page });
  });
});

listen(fastify);
