import request from 'supertest';
import { randomBytes } from 'crypto';
import { createApp } from '../src/app';

export const app = createApp();

export async function registerUser(label = 'user') {
  const email = `${label}-${randomBytes(6).toString('hex')}@test.local`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: label, email, password: 'Password123!', workspaceName: `${label} ws` });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token: string = res.body.data.token;
  return { email, token, auth: { Authorization: `Bearer ${token}` } };
}

export const sampleCase = (projectId: string, extra: Record<string, unknown> = {}) => ({
  projectId,
  title: 'Login with valid credentials',
  steps: ['Open login page', 'Enter valid email and password', 'Click Sign in'],
  expectedResult: 'User lands on the dashboard',
  priority: 'HIGH',
  type: 'SMOKE',
  ...extra,
});
