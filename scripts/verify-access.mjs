import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Exercise the real route handlers with an isolated SQLite database and no network.
const require = createRequire(import.meta.url);
const buildRequire = createRequire(require.resolve('wrangler/package.json'));
const { build } = buildRequire('esbuild');
const temp = await mkdtemp(join(tmpdir(), 'space-eye-access-'));
const sql = new DatabaseSync(':memory:');
let objectReads = 0;
globalThis.__spaceEyeTestBindings = {
  DB: { prepare(query) {
    return { bind(...values) {
      const statement = sql.prepare(query);
      return {
        async first() { return statement.get(...values) ?? null; },
        async all() { return { results: statement.all(...values) }; },
        async run() { return statement.run(...values); },
      };
    } };
  } },
  BUCKET: { async get() { objectReads++; throw new Error('Unexpected object access'); } },
};
globalThis.__spaceEyeTestHeaders = new Headers();
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Access checks must not call an imagery provider'); };

try {
  const output = await build({
    stdin: { resolveDir: resolve('.'), contents: `
      export * as identity from './lib/server.ts';
      export * as auth from './app/chatgpt-auth.ts';
      export * as navigation from './lib/workspace-navigation.ts';
      export * as profile from './app/api/profile/route.ts';
      export * as archive from './app/api/analyses/route.ts';
      export * as observation from './app/api/analyses/[id]/route.ts';
      export * as image from './app/api/analyses/[id]/image/[kind]/route.ts';
      export * as report from './app/api/analyses/[id]/report/route.ts';
      export * as places from './app/api/places/route.ts';
      export * as scenes from './app/api/satellite/scenes/route.ts';
      export * as capture from './app/api/satellite/image/route.ts';
      export * as analyze from './app/api/satellite/analyze/route.ts';
    ` },
    bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
    plugins: [{ name: 'isolated-test-bindings', setup(builder) {
      builder.onResolve({ filter: /^(cloudflare:workers|next\/headers|next\/navigation)$/ }, args => ({ path: args.path, namespace: 'test-runtime' }));
      builder.onLoad({ filter: /.*/, namespace: 'test-runtime' }, args => ({ contents:
        args.path === 'cloudflare:workers' ? 'export const env = globalThis.__spaceEyeTestBindings;' :
        args.path === 'next/headers' ? 'export async function headers() { return globalThis.__spaceEyeTestHeaders; }' :
        'export function redirect(path) { throw Object.assign(new Error("redirect"), { destination: path }); }'
      }));
    } }],
  });
  const file = join(temp, 'routes.cjs');
  await writeFile(file, output.outputFiles[0].contents);
  const routes = require(file);
  const request = (headers = {}, method = 'GET') => new Request('https://space-eye.test/api/check', { method, headers });
  const context = { params: Promise.resolve({ id: 'observation-a', kind: 'original' }) };
  const endpoints = [
    [routes.profile.GET, 'GET'], [routes.archive.GET, 'GET'], [routes.archive.POST, 'POST'],
    [routes.observation.GET, 'GET'], [routes.image.GET, 'GET'], [routes.report.GET, 'GET'],
    [routes.places.GET, 'GET'], [routes.scenes.GET, 'GET'], [routes.capture.GET, 'GET'], [routes.analyze.POST, 'POST'],
  ];
  for (const headers of [{}, { 'oai-authenticated-user-id': 'a' }, { 'oai-authenticated-user-email': 'a@example.test' }]) {
    for (const [handler, method] of endpoints) {
      const response = await handler(request(headers, method), context);
      assert.equal(response.status, 401, `${method} handler must reject an absent or incomplete identity`);
      assert.match(response.headers.get('cache-control'), /private.*no-store/);
    }
  }
  console.log('PASS: all 10 API operations reject absent and incomplete identities without provider or storage access.');

  const userA = { 'oai-authenticated-user-id': 'fixture-user-a', 'oai-authenticated-user-email': 'a@example.test' };
  const userB = { 'oai-authenticated-user-id': 'fixture-user-b', 'oai-authenticated-user-email': 'b@example.test' };
  const a = await routes.identity.identity(request(userA));
  const b = await routes.identity.identity(request(userB));
  assert.notEqual(a.owner, b.owner);
  const renamed = await routes.identity.identity(request({ ...userA, 'oai-authenticated-user-email': 'renamed@example.test' }));
  assert.equal(renamed.owner, a.owner, 'Changing an email must preserve existing archive ownership');
  sql.exec('CREATE TABLE analyses (id TEXT PRIMARY KEY, owner TEXT, type TEXT, created_at TEXT, payload TEXT)');
  const put = sql.prepare('INSERT INTO analyses VALUES (?, ?, ?, ?, ?)');
  put.run('observation-a', a.owner, 'water', '2026-01-01', JSON.stringify({ id: 'observation-a', location: 'Private A' }));
  put.run('observation-b', b.owner, 'forest', '2026-01-02', JSON.stringify({ id: 'observation-b', location: 'Private B' }));
  const archive = await (await routes.archive.GET(request(userA))).json();
  assert.deepEqual(archive.analyses.map(row => row.id), ['observation-a']);
  assert.deepEqual(archive.counts, { water: 1 });
  assert.equal((await routes.observation.GET(request(userA), context)).status, 200);
  for (const handler of [routes.observation.GET, routes.image.GET, routes.report.GET]) {
    assert.equal((await handler(request(userB), context)).status, 404, 'Another account cannot read an observation, image, or report');
  }
  assert.equal(objectReads, 0, 'Unauthorized reads must not reach the image bucket');
  assert.equal((await routes.archive.POST(request({ ...userA, origin: 'https://other.test' }, 'POST'))).status, 403);
  console.log('PASS: private archive isolation, private image/report rejection, stable owner IDs, and cross-origin write rejection.');

  assert.equal(await routes.auth.getChatGPTUser(), null);
  await assert.rejects(routes.auth.requireChatGPTUser('/workspace?view=water'), error => error.destination === '/signin-with-chatgpt?return_to=%2Fworkspace%3Fview%3Dwater');
  globalThis.__spaceEyeTestHeaders = new Headers(userA);
  assert.equal((await routes.auth.requireChatGPTUser('/workspace')).userId, 'fixture-user-a');
  for (const unsafe of ['https://other.test', '//other.test', '/\\other.test', '/login', '/signin-with-chatgpt', '/workspace/../login', ['/workspace?view=water']]) {
    assert.equal(routes.navigation.workspaceReturnTo(unsafe), '/workspace');
  }
  assert.equal(routes.navigation.workspaceReturnTo('/workspace?view=water'), '/workspace?view=water');
  assert.equal(routes.navigation.workspaceReturnTo('/workspace?view=invalid&return_to=https://other.test'), '/workspace');
  console.log('PASS: server page sign-in gate, selected-tool return, and malicious return destination rejection.');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.__spaceEyeTestBindings;
  delete globalThis.__spaceEyeTestHeaders;
  sql.close();
  await rm(temp, { recursive: true, force: true });
}
