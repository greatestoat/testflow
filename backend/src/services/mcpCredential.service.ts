import { createHmac, randomBytes } from 'crypto';
import { env } from '../config/env';
import { mcpCredentialRepository } from '../repositories/mcpCredential.repository';
import { notFound } from '../utils/errors';

export const hashCredential = (raw: string) =>
  createHmac('sha256', env.MCP_CREDENTIAL_SECRET).update(raw).digest('hex');

export const mcpCredentialService = {
  /** The raw token is returned ONCE; only its HMAC is stored. */
  async create(workspaceId: string, name: string) {
    const token = `tfm_${randomBytes(32).toString('hex')}`;
    const row = await mcpCredentialRepository.create(workspaceId, name, hashCredential(token));
    return { id: row.id, name: row.name, createdAt: row.createdAt, token };
  },

  list: (workspaceId: string) => mcpCredentialRepository.list(workspaceId),

  async revoke(workspaceId: string, id: string) {
    const row = await mcpCredentialRepository.find(workspaceId, id);
    if (!row) throw notFound('Credential');
    if (!row.revokedAt) await mcpCredentialRepository.revoke(id);
  },

  /** Returns the workspace id for a valid, non-revoked token, else null. */
  async authenticate(rawToken: string) {
    const row = await mcpCredentialRepository.findByHash(hashCredential(rawToken));
    if (!row || row.revokedAt) return null;
    await mcpCredentialRepository.touch(row.id);
    return { workspaceId: row.workspaceId, credentialId: row.id, name: row.name };
  },
};
