import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import autocannon from 'autocannon';

import { runCompilerMicrobenchmarks } from './micro/compiler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');

const duration = quick ? 3 : 10;
const connections = quick ? 5 : 10;
const pipelining = 1;
const warmup = quick ? { connections: 1, duration: 2 } : { connections: 1, duration: 3 };

const httpBenchmarks = [
  {
    group: 'Validation',
    name: 'validation-json',
    file: 'validation-json.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Validation',
    name: 'validation-zod',
    file: 'validation-zod.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Validation',
    name: 'validation-yup',
    file: 'validation-yup.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Validation',
    name: 'validation-joi',
    file: 'validation-joi.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Validation',
    name: 'validation-vine',
    file: 'validation-vine.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Serializer',
    name: 'serializer-json',
    file: 'serializer-json.benchmark.cjs',
    path: '/',
  },
  {
    group: 'Serializer',
    name: 'serializer-zod',
    file: 'serializer-zod.benchmark.cjs',
    path: '/',
  },
  {
    group: 'Serializer',
    name: 'serializer-yup',
    file: 'serializer-yup.benchmark.cjs',
    path: '/',
  },
  {
    group: 'Serializer',
    name: 'serializer-joi',
    file: 'serializer-joi.benchmark.cjs',
    path: '/',
  },
  {
    group: 'Validation + Serializer',
    name: 'both-json',
    file: 'both-json.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Validation + Serializer',
    name: 'both-zod',
    file: 'both-zod.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Validation + Serializer',
    name: 'both-yup',
    file: 'both-yup.benchmark.cjs',
    path: '/?page=1',
  },
  {
    group: 'Validation + Serializer',
    name: 'both-joi',
    file: 'both-joi.benchmark.cjs',
    path: '/?page=1',
  },
];

function waitForReady(child, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    let output = '';

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Benchmark server timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onData = (chunk) => {
      output += chunk.toString();

      if (output.includes('benchmark-ready')) {
        cleanup();
        resolve();
      }
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`Benchmark server exited before ready (code ${code})`));
    };

    const cleanup = () => {
      clearTimeout(timer);
      child.stdout?.off('data', onData);
      child.stderr?.off('data', onData);
      child.off('exit', onExit);
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', onExit);
  });
}

async function startServer(benchmarkFile, port) {
  const child = spawn(process.execPath, [path.join(__dirname, benchmarkFile)], {
    cwd: rootDir,
    env: {
      ...process.env,
      BENCHMARK_PORT: String(port),
      BENCHMARK_HOST: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForReady(child);
  return child;
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (child.killed || child.exitCode !== null) {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    child.kill('SIGTERM');

    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, 2_000).unref();
  });
}

function runAutocannon(url) {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        duration,
        connections,
        pipelining,
        warmup,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );
  });
}

function formatBytesPerSec(value) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB/s`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(2)} KB/s`;
  }

  return `${value.toFixed(0)} B/s`;
}

function summarizeHttpResult(benchmark, result) {
  return {
    group: benchmark.group,
    name: benchmark.name,
    reqPerSec: Number(result.requests.average.toFixed(2)),
    latencyMs: Number(result.latency.average.toFixed(2)),
    throughput: formatBytesPerSec(result.throughput.average),
    totalRequests: result.requests.total,
    errors: result.errors,
  };
}

function rankRows(rows, getValue, { higherIsBetter = true } = {}) {
  if (rows.length < 2) {
    return rows.map((row) => ({ ...row, rank: null }));
  }

  const values = rows.map((row) => getValue(row));
  const bestValue = higherIsBetter ? Math.max(...values) : Math.min(...values);
  const worstValue = higherIsBetter ? Math.min(...values) : Math.max(...values);

  if (bestValue === worstValue) {
    return rows.map((row) => ({ ...row, rank: null }));
  }

  return rows.map((row) => {
    const value = getValue(row);

    if (value === bestValue) {
      return { ...row, rank: 'best' };
    }

    if (value === worstValue) {
      return { ...row, rank: 'worst' };
    }

    return { ...row, rank: null };
  });
}

function formatRankedName(name, rank) {
  if (rank === 'best') {
    return `${name} 🥇`;
  }

  if (rank === 'worst') {
    return `${name} 🐌`;
  }

  return name;
}

function getMicroGroup(name) {
  if (name.startsWith('isStandardSchema')) {
    return 'isStandardSchema';
  }

  if (name.startsWith('validatorCompiler')) {
    return 'validatorCompiler';
  }

  if (name.startsWith('serializerCompiler')) {
    return 'serializerCompiler';
  }

  return 'other';
}

function rankMicroResults(microResults) {
  const grouped = microResults.reduce((accumulator, row) => {
    const group = getMicroGroup(row.name);
    accumulator.set(group, [...(accumulator.get(group) ?? []), row]);
    return accumulator;
  }, new Map());

  const ranked = [];

  for (const rows of grouped.values()) {
    ranked.push(...rankRows(rows, (row) => row.opsPerSec));
  }

  return ranked;
}

function renderMarkdownReport({
  packageName,
  packageVersion,
  nodeVersion,
  platform,
  cpuModel,
  durationSeconds,
  connections,
  warmupSeconds,
  httpResults,
  microResults,
}) {
  const generatedAt = new Date().toISOString();

  const grouped = httpResults.reduce((accumulator, row) => {
    accumulator.set(row.group, [...(accumulator.get(row.group) ?? []), row]);
    return accumulator;
  }, new Map());

  let markdown = `# Benchmark Report — ${packageName}@${packageVersion}

Generated: ${generatedAt}

## Environment

| Key | Value |
| --- | --- |
| Node.js | ${nodeVersion} |
| Platform | ${platform} |
| CPU | ${cpuModel} |
| Duration | ${durationSeconds}s |
| Connections | ${connections} |
| Warmup | ${warmupSeconds}s (1 connection, excluded from results) |

## HTTP Benchmarks (autocannon)

🥇 fastest in group · 🐌 slowest in group (by req/sec)

`;

  for (const [group, rows] of grouped) {
    const rankedRows = rankRows(rows, (row) => row.reqPerSec);

    markdown += `### ${group}\n\n`;
    markdown += '| Benchmark | Req/sec | Latency (ms) | Throughput | Total requests | Errors |\n';
    markdown += '| --- | ---: | ---: | --- | ---: | ---: |\n';

    for (const row of rankedRows) {
      markdown += `| ${formatRankedName(row.name, row.rank)} | ${row.reqPerSec.toLocaleString()} | ${row.latencyMs} | ${row.throughput} | ${row.totalRequests.toLocaleString()} | ${row.errors} |\n`;
    }

    markdown += '\n';
  }

  const rankedMicroResults = rankMicroResults(microResults);

  markdown += `## Compiler Microbenchmarks

Direct calls into compiled validators/serializers. The \`serializerCompiler sync fallback candidates\` row exercises the synchronous candidate loop used when \`~standard.validate\` returns a promise.

🥇 fastest in group · 🐌 slowest in group (by ops/sec). Rows are ranked within \`isStandardSchema\`, \`validatorCompiler\`, and \`serializerCompiler\` categories.

| Benchmark | Iterations | Elapsed (ms) | Ops/sec |
| --- | ---: | ---: | ---: |
`;

  for (const row of rankedMicroResults) {
    markdown += `| ${formatRankedName(row.name, row.rank)} | ${row.iterations.toLocaleString()} | ${row.elapsedMs} | ${row.opsPerSec.toLocaleString()} |\n`;
  }

  markdown += '\n';

  return markdown;
}

async function main() {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
  const reportsDir = path.join(__dirname, 'reports');
  await mkdir(reportsDir, { recursive: true });

  const httpResults = [];
  let port = 31_000;

  for (const benchmark of httpBenchmarks) {
    const child = await startServer(benchmark.file, port);
    const url = `http://127.0.0.1:${port}${benchmark.path}`;

    process.stdout.write(`Running ${benchmark.name}... `);

    try {
      const result = await runAutocannon(url);
      const summary = summarizeHttpResult(benchmark, result);
      httpResults.push(summary);
      process.stdout.write(`${summary.reqPerSec.toLocaleString()} req/sec\n`);
    } finally {
      await stopServer(child);
      port += 1;
    }
  }

  process.stdout.write('Running compiler microbenchmarks...\n');
  const microResults = await runCompilerMicrobenchmarks();

  const markdown = renderMarkdownReport({
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpuModel: cpus()[0]?.model ?? 'unknown',
    durationSeconds: duration,
    connections,
    warmupSeconds: warmup.duration,
    httpResults,
    microResults,
  });

  const versionReportPath = path.join(reportsDir, `${packageJson.version}.md`);
  const latestReportPath = path.join(__dirname, 'RESULTS.md');

  await writeFile(versionReportPath, markdown);
  await writeFile(latestReportPath, markdown);

  process.stdout.write(`\nReport written to:\n- ${path.relative(rootDir, versionReportPath)}\n`);
  process.stdout.write(`- ${path.relative(rootDir, latestReportPath)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
