# Benchmark Report — fastify-standard-schema@5.0.2

Generated: 2026-09-01T18:26:12.384Z

## Environment

| Key | Value |
| --- | --- |
| Node.js | v24.13.1 |
| Platform | darwin arm64 |
| CPU | unknown |
| Duration | 3s |
| Connections | 5 |

## HTTP Benchmarks (autocannon)

🥇 fastest in group · 🐌 slowest in group (by req/sec)

### Validation

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| validation-json | 48,090.67 | 0.01 | 8.30 MB/s | 144,263 | 0 |
| validation-zod 🐌 | 36,752 | 0.01 | 11.11 MB/s | 110,243 | 0 |
| validation-yup | 50,810.67 | 0.01 | 8.77 MB/s | 152,446 | 0 |
| validation-joi | 53,690.67 | 0.01 | 9.27 MB/s | 161,059 | 0 |
| validation-vine 🥇 | 53,968 | 0.01 | 9.31 MB/s | 161,875 | 0 |

### Serializer

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| serializer-json | 51,984 | 0.01 | 9.32 MB/s | 155,955 | 0 |
| serializer-zod | 47,962.67 | 0.01 | 8.60 MB/s | 143,885 | 0 |
| serializer-yup 🥇 | 52,869.34 | 0.01 | 9.48 MB/s | 158,610 | 0 |
| serializer-joi 🐌 | 45,850.67 | 0.01 | 8.22 MB/s | 137,576 | 0 |

### Validation + Serializer

| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |
| --- | ---: | ---: | --- | ---: | ---: |
| both-json 🥇 | 55,824 | 0.01 | 9.64 MB/s | 167,465 | 0 |
| both-zod 🐌 | 37,349.34 | 0.01 | 11.29 MB/s | 112,040 | 0 |
| both-yup | 44,698.67 | 0.01 | 7.80 MB/s | 134,111 | 0 |
| both-joi | 50,437.34 | 0.01 | 8.80 MB/s | 151,330 | 0 |

## Compiler Microbenchmarks

Direct calls into compiled validators/serializers. The `serializerCompiler sync fallback candidates` row exercises the synchronous candidate loop used when `~standard.validate` returns a promise.

🥇 fastest in group · 🐌 slowest in group (by ops/sec). Rows are ranked within `isStandardSchema`, `validatorCompiler`, and `serializerCompiler` categories.

| Benchmark | Iterations | Elapsed (ms) | Ops/sec |
| --- | ---: | ---: | ---: |
| isStandardSchema (zod) 🥇 | 200,000 | 2.94 | 68,135,346.78 |
| isStandardSchema (joi) 🐌 | 200,000 | 7.45 | 26,860,813.04 |
| isStandardSchema (vine) | 200,000 | 2.97 | 67,343,831.34 |
| validatorCompiler sync (zod) 🥇 | 200,000 | 5.55 | 36,027,921.64 |
| validatorCompiler sync (joi) 🐌 | 200,000 | 102.4 | 1,953,149.64 |
| validatorCompiler async (vine) | 200,000 | 46.66 | 4,285,978.3 |
| serializerCompiler sync (zod) 🥇 | 200,000 | 16.14 | 12,390,070.65 |
| serializerCompiler sync (joi) 🐌 | 200,000 | 69.77 | 2,866,659.14 |
| serializerCompiler sync fallback candidates (safeParse) | 200,000 | 17.02 | 11,749,414.37 |

