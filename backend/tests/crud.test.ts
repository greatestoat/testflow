import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, registerUser, sampleCase } from './helpers';

let auth: Record<string, string>;
let projectId: string;

beforeAll(async () => {
  auth = (await registerUser('crud')).auth;
});

describe('projects', () => {
  it('create / list / get / update', async () => {
    const created = await request(app)
      .post('/api/projects')
      .set(auth)
      .send({ name: 'Volopay Web', applicationName: 'Web App', environment: 'staging' });
    expect(created.status).toBe(201);
    projectId = created.body.data.id;

    const list = await request(app).get('/api/projects').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.map((p: any) => p.id)).toContain(projectId);

    expect((await request(app).get(`/api/projects/${projectId}`).set(auth)).body.data.name).toBe('Volopay Web');

    const upd = await request(app).put(`/api/projects/${projectId}`).set(auth).send({ environment: 'production' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.environment).toBe('production');
  });

  it('rejects invalid input and bad ids', async () => {
    expect((await request(app).post('/api/projects').set(auth).send({ name: '' })).status).toBe(400);
    expect((await request(app).put(`/api/projects/${projectId}`).set(auth).send({})).status).toBe(400);
    expect((await request(app).get('/api/projects/not-an-id').set(auth)).status).toBe(400);
    expect((await request(app).get('/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa').set(auth)).status).toBe(404);
  });

  it('requires auth', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
  });
});

describe('suites', () => {
  it('create / list / update / delete', async () => {
    const created = await request(app)
      .post('/api/suites')
      .set(auth)
      .send({ projectId, name: 'Payments', feature: 'Checkout' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const list = await request(app).get(`/api/suites?projectId=${projectId}`).set(auth);
    expect(list.body.data.map((s: any) => s.id)).toContain(id);

    const upd = await request(app).put(`/api/suites/${id}`).set(auth).send({ name: 'Payments v2' });
    expect(upd.body.data.name).toBe('Payments v2');

    expect((await request(app).delete(`/api/suites/${id}`).set(auth)).status).toBe(204);
    expect((await request(app).delete(`/api/suites/${id}`).set(auth)).status).toBe(404);
  });

  it('rejects a suite for a non-existent project', async () => {
    const res = await request(app)
      .post('/api/suites')
      .set(auth)
      .send({ projectId: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('test cases', () => {
  it('create / get / list+filter / update / delete', async () => {
    const created = await request(app).post('/api/test-cases').set(auth).send(sampleCase(projectId));
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('DRAFT');
    const id = created.body.data.id;

    expect((await request(app).get(`/api/test-cases/${id}`).set(auth)).body.data.title).toMatch(/Login/);

    const list = await request(app).get(`/api/test-cases?projectId=${projectId}&priority=HIGH&search=login`).set(auth);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(1);

    const upd = await request(app).put(`/api/test-cases/${id}`).set(auth).send({ status: 'READY' });
    expect(upd.body.data.status).toBe('READY');

    expect((await request(app).delete(`/api/test-cases/${id}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/api/test-cases/${id}`).set(auth)).status).toBe(404);
  });

  it('rejects invalid enum / missing fields', async () => {
    const bad = await request(app).post('/api/test-cases').set(auth).send(sampleCase(projectId, { priority: 'URGENT' }));
    expect(bad.status).toBe(400);
    const missing = await request(app).post('/api/test-cases').set(auth).send({ projectId, title: 'x' });
    expect(missing.status).toBe(400);
  });

  it('rejects a suite from a different project', async () => {
    const p2 = (await request(app).post('/api/projects').set(auth).send({ name: 'Other' })).body.data.id;
    const suite = (await request(app).post('/api/suites').set(auth).send({ projectId: p2, name: 'S' })).body.data.id;
    const res = await request(app).post('/api/test-cases').set(auth).send(sampleCase(projectId, { suiteId: suite }));
    expect(res.status).toBe(400);
  });
});

describe('executions and reports', () => {
  it('records executions, lists history, and reports real numbers', async () => {
    const id = (await request(app).post('/api/test-cases').set(auth).send(sampleCase(projectId))).body.data.id;

    const failed = await request(app)
      .post(`/api/test-cases/${id}/execute`)
      .set(auth)
      .send({ status: 'FAILED', executionNotes: 'Button missing' });
    expect(failed.status).toBe(201);
    expect(failed.body.data.executedById).toBeTruthy();

    await request(app).post(`/api/test-cases/${id}/execute`).set(auth).send({ status: 'PASSED' });

    const history = await request(app).get(`/api/test-cases/${id}/executions`).set(auth);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.data[0].status).toBe('PASSED'); // newest first

    expect((await request(app).post(`/api/test-cases/${id}/execute`).set(auth).send({ status: 'MAYBE' })).status).toBe(400);

    const summary = await request(app).get('/api/reports/summary').set(auth);
    expect(summary.status).toBe(200);
    expect(summary.body.data.totals.executions).toBe(2);
    expect(summary.body.data.executionsByStatus.FAILED).toBe(1);
    expect(summary.body.data.latestResults.PASSED).toBe(1);

    const csv = await request(app).get('/api/reports/export').set(auth);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Login with valid credentials');
  });

  it('deleting a project removes its children', async () => {
    const pid = (await request(app).post('/api/projects').set(auth).send({ name: 'Temp' })).body.data.id;
    const tc = (await request(app).post('/api/test-cases').set(auth).send(sampleCase(pid))).body.data.id;
    expect((await request(app).delete(`/api/projects/${pid}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/api/test-cases/${tc}`).set(auth)).status).toBe(404);
  });
});
