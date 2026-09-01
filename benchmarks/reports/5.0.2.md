# Benchmark Report — fastify-standard-schema@5.0.2

Generated: 2026-09-01T18:15:36.560Z

## Environment

| Key | Value |
| --- | --- |
| Node.js | v24.20.0 |
| Platform | darwin arm64 |
| CPU | unknown |
| Duration | 3s |
| Connections | 5 |

## HTTP Benchmarks (autocannon)

🥇 fastest in group · 🐌 slowest in group (by req/sec)

### Validation

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| validation-json | 48,965.34 | 0.01 | 8.45 MB/s | 146,900 | 0 |
| validation-zod 🐌 | 32,242.67 | 0.01 | 9.75 MB/s | 96,722 | 0 |
| validation-yup | 39,122.67 | 0.01 | 6.75 MB/s | 117,370 | 0 |
| validation-joi 🥇 | 49,072 | 0.01 | 8.47 MB/s | 147,206 | 0 |
| validation-vine | 48,592 | 0.01 | 8.39 MB/s | 145,789 | 0 |

### Serializer

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| serializer-json 🥇 | 51,706.67 | 0.01 | 9.27 MB/s | 155,132 | 0 |
| serializer-zod | 44,986.67 | 0.01 | 8.07 MB/s | 134,939 | 0 |
| serializer-yup 🐌 | 44,560 | 0.01 | 7.99 MB/s | 133,696 | 0 |
| serializer-joi | 46,576 | 0.01 | 8.35 MB/s | 139,695 | 0 |

### Validation + Serializer

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| both-json 🥇 | 51,152 | 0.01 | 8.83 MB/s | 153,433 | 0 |
| both-zod 🐌 | 37,850.67 | 0.01 | 11.44 MB/s | 113,544 | 0 |
| both-yup | 41,082.67 | 0.01 | 7.17 MB/s | 123,216 | 0 |
| both-joi | 48,560 | 0.01 | 8.48 MB/s | 145,684 | 0 |

## Compiler Microbenchmarks

Direct calls into compiled validators/serializers. The `serializerCompiler sync fallback candidates` row exercises the synchronous candidate loop used when `~standard.validate` returns a promise.

🥇 fastest in group · 🐌 slowest in group (by ops/sec). Rows are ranked within `isStandardSchema`, `validatorCompiler`, and `serializerCompiler` categories.

| Benchmark | Iterations | Elapsed (ms) | Ops/sec |
| --- | ---: | ---: | ---: |
| isStandardSchema (zod) 🥇 | 200,000 | 3.14 | 63,672,286.38 |
| isStandardSchema (joi) 🐌 | 200,000 | 8.02 | 24,938,821.95 |
| isStandardSchema (vine) | 200,000 | 3.14 | 63,611,552.24 |
| validatorCompiler sync (zod) 🥇 | 200,000 | 6.11 | 32,747,518.43 |
| validatorCompiler sync (joi) 🐌 | 200,000 | 105.29 | 1,899,427.68 |
| validatorCompiler async (vine) | 200,000 | 50.73 | 3,942,725.37 |
| serializerCompiler sync (zod) 🥇 | 200,000 | 16.05 | 12,463,680.06 |
| serializerCompiler sync (joi) 🐌 | 200,000 | 71.58 | 2,794,009.85 |
| serializerCompiler sync fallback candidates (safeParse) | 200,000 | 24.93 | 8,023,643.11 |

