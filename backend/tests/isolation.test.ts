import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, registerUser, sampleCase } from './helpers';

let a: Record<string, string>;
let b: Record<string, string>;
let projectId: string;
let suiteId: string;
let caseId: string;

beforeAll(async () => {
  a = (await registerUser('tenantA')).auth;
  b = (await registerUser('tenantB')).auth;
  projectId = (await request(app).post('/api/projects').set(a).send({ name: 'A project' })).body.data.id;
  suiteId = (await request(app).post('/api/suites').set(a).send({ projectId, name: 'A suite' })).body.data.id;
  caseId = (await request(app).post('/api/test-cases').set(a).send(sampleCase(projectId))).body.data.id;
});

describe('workspace isolation', () => {
  it("tenant B cannot see tenant A's data in lists", async () => {
    expect((await request(app).get('/api/projects').set(b)).body.data).toHaveLength(0);
    expect((await request(app).get('/api/suites').set(b)).body.data).toHaveLength(0);
    expect((await request(app).get('/api/test-cases').set(b)).body.data).toHaveLength(0);
  });

  it("tenant B gets 404 reading/modifying/deleting tenant A's records", async () => {
    expect((await request(app).get(`/api/projects/${projectId}`).set(b)).status).toBe(404);
    expect((await request(app).put(`/api/projects/${projectId}`).set(b).send({ name: 'hacked' })).status).toBe(404);
    expect((await request(app).delete(`/api/projects/${projectId}`).set(b)).status).toBe(404);
    expect((await request(app).put(`/api/suites/${suiteId}`).set(b).send({ name: 'hacked' })).status).toBe(404);
    expect((await request(app).delete(`/api/suites/${suiteId}`).set(b)).status).toBe(404);
    expect((await request(app).get(`/api/test-cases/${caseId}`).set(b)).status).toBe(404);
    expect((await request(app).put(`/api/test-cases/${caseId}`).set(b).send({ title: 'hacked' })).status).toBe(404);
    expect((await request(app).delete(`/api/test-cases/${caseId}`).set(b)).status).toBe(404);
  });

  it("tenant B cannot execute or read executions of tenant A's test case", async () => {
    expect((await request(app).post(`/api/test-cases/${caseId}/execute`).set(b).send({ status: 'PASSED' })).status).toBe(404);
    expect((await request(app).get(`/api/test-cases/${caseId}/executions`).set(b)).status).toBe(404);
  });

  it("tenant B cannot attach records to tenant A's project or suite", async () => {
    expect((await request(app).post('/api/suites').set(b).send({ projectId, name: 'x' })).status).toBe(404);
    expect((await request(app).post('/api/test-cases').set(b).send(sampleCase(projectId))).status).toBe(404);
  });

  it("reports only count the caller's workspace", async () => {
    const s = await request(app).get('/api/reports/summary').set(b);
    expect(s.body.data.totals).toEqual({ projects: 0, suites: 0, testCases: 0, executions: 0 });
    expect(s.body.data.passRate).toBeNull();
    expect((await request(app).get('/api/reports/export').set(b)).text).not.toContain('Login with valid credentials');
  });

  it("tenant A's data is untouched", async () => {
    expect((await request(app).get(`/api/test-cases/${caseId}`).set(a)).body.data.title).toMatch(/Login/);
  });
});

describe('MCP credentials are workspace-scoped', () => {
  it('rejects missing/invalid tokens and revoked credentials', async () => {
    const rpc = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
    const headers = { Accept: 'application/json, text/event-stream' };
    expect((await request(app).post('/mcp').set(headers).send(rpc)).status).toBe(401);
    expect((await request(app).post('/mcp').set(headers).set('Authorization', 'Bearer tfm_bad').send(rpc)).status).toBe(401);

    const cred = (await request(app).post('/api/mcp-credentials').set(a).send({ name: 'claude' })).body.data;
    expect(cred.token).toMatch(/^tfm_/);

    const ok = await request(app).post('/mcp').set(headers).set('Authorization', `Bearer ${cred.token}`).send(rpc);
    expect(ok.status).toBe(200);
    expect(ok.text).toContain('create_test_case');

    // list endpoint never exposes the token or hash
    const list = (await request(app).get('/api/mcp-credentials').set(a)).body.data;
    expect(JSON.stringify(list)).not.toContain(cred.token);
    expect(list[0].credentialHash).toBeUndefined();

    // tenant B cannot revoke A's credential
    expect((await request(app).delete(`/api/mcp-credentials/${cred.id}`).set(b)).status).toBe(404);

    expect((await request(app).delete(`/api/mcp-credentials/${cred.id}`).set(a)).status).toBe(204);
    expect((await request(app).post('/mcp').set(headers).set('Authorization', `Bearer ${cred.token}`).send(rpc)).status).toBe(401);
  });
});
