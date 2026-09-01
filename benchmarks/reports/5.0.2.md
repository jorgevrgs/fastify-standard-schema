# Benchmark Report — fastify-standard-schema@5.0.2

Generated: 2026-09-01T19:15:32.729Z

## Environment

| Key | Value |
| --- | --- |
| Node.js | v24.20.0 |
| Platform | darwin arm64 |
| CPU | unknown |
| Duration | 3s |
| Connections | 5 |
| Warmup | 2s (1 connection, excluded from results) |

## HTTP Benchmarks (autocannon)

🥇 fastest in group · 🐌 slowest in group (by req/sec)

### Validation

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| validation-json | 42,768 | 0.01 | 7.38 MB/s | 128,301 | 0 |
| validation-zod 🐌 | 31,789.34 | 0.01 | 9.61 MB/s | 95,370 | 0 |
| validation-yup | 43,162.67 | 0.01 | 7.45 MB/s | 129,487 | 0 |
| validation-joi | 47,888 | 0.01 | 8.26 MB/s | 143,644 | 0 |
| validation-vine 🥇 | 50,757.34 | 0.01 | 8.76 MB/s | 152,259 | 0 |

### Serializer

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| serializer-json | 48,005.34 | 0.01 | 8.61 MB/s | 144,032 | 0 |
| serializer-zod 🐌 | 37,816 | 0.01 | 6.78 MB/s | 113,456 | 0 |
| serializer-yup | 40,336 | 0.01 | 7.23 MB/s | 121,013 | 0 |
| serializer-joi 🥇 | 48,272 | 0.01 | 8.65 MB/s | 144,833 | 0 |

### Validation + Serializer

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| both-json 🥇 | 47,440 | 0.01 | 8.19 MB/s | 142,320 | 0 |
| both-zod | 33,602.67 | 0.01 | 10.16 MB/s | 100,814 | 0 |
| both-yup 🐌 | 24,522.67 | 0.02 | 4.28 MB/s | 73,558 | 0 |
| both-joi | 45,861.34 | 0.01 | 8.00 MB/s | 137,555 | 0 |

## Compiler Microbenchmarks

Direct calls into compiled validators/serializers. The `serializerCompiler sync fallback candidates` row exercises the synchronous candidate loop used when `~standard.validate` returns a promise.

🥇 fastest in group · 🐌 slowest in group (by ops/sec). Rows are ranked within `isStandardSchema`, `validatorCompiler`, and `serializerCompiler` categories.

| Benchmark | Iterations | Elapsed (ms) | Ops/sec |
| --- | ---: | ---: | ---: |
| isStandardSchema (zod) 🥇 | 200,000 | 3.01 | 66,357,925.36 |
| isStandardSchema (joi) 🐌 | 200,000 | 8.11 | 24,652,297.83 |
| isStandardSchema (vine) | 200,000 | 3.25 | 61,562,139.28 |
| validatorCompiler sync (zod) 🥇 | 200,000 | 6.45 | 31,022,180.86 |
| validatorCompiler sync (joi) 🐌 | 200,000 | 111.25 | 1,797,760.23 |
| validatorCompiler async (vine) | 200,000 | 50.88 | 3,930,875.55 |
| serializerCompiler sync (zod) 🥇 | 200,000 | 16.9 | 11,837,004.92 |
| serializerCompiler sync (joi) 🐌 | 200,000 | 74.33 | 2,690,649.32 |
| serializerCompiler sync fallback candidates (safeParse) | 200,000 | 17.87 | 11,189,541.72 |

