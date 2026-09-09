'use strict';

function listen(fastify) {
  const port = Number(process.env.BENCHMARK_PORT ?? 3000);
  const host = process.env.BENCHMARK_HOST ?? '127.0.0.1';

  fastify.listen({ port, host }, (error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    console.log('benchmark-ready');
  });
}

module.exports = { listen };
