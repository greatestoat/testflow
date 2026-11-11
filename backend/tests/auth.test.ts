import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerUser } from './helpers';

describe('health', () => {
  it('GET /health and /api/health', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

describe('auth', () => {
  it('registers, creates a workspace, and returns a token', async () => {
    const email = `reg-${Date.now()}@test.local`;
    const res = await request(app).post('/api/auth/register').send({ name: 'Reg', email, password: 'Password123!' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.workspace.id).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    const email = `dup-${Date.now()}@test.local`;
    const body = { name: 'Dup', email, password: 'Password123!' };
    await request(app).post('/api/auth/register').send(body);
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(409);
  });

  it('rejects invalid registration with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: '', email: 'nope', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct password and rejects wrong password', async () => {
    const email = `login-${Date.now()}@test.local`;
    await request(app).post('/api/auth/register').send({ name: 'L', email, password: 'Password123!' });
    const good = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(good.status).toBe(200);
    expect(good.body.data.token).toBeTruthy();
    const bad = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  it('GET /api/auth/me requires a valid token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const u = await registerUser('me');
    const res = await request(app).get('/api/auth/me').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(u.email);
    expect(res.body.data.workspaces).toHaveLength(1);
  });

  it('logout returns 200 for an authenticated user', async () => {
    const u = await registerUser('out');
    expect((await request(app).post('/api/auth/logout').set(u.auth)).status).toBe(200);
  });
});
