import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpCredentialService } from '../services/mcpCredential.service';
import { buildMcpServer } from './server';

const rpcError = (res: Response, status: number, message: string) =>
  res.status(status).json({ jsonrpc: '2.0', error: { code: -32000, message }, id: null });

/** Stateless Streamable HTTP endpoint: POST /mcp with `Authorization: Bearer tfm_...` */
export async function mcpPostHandler(req: Request, res: Response) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return rpcError(res, 401, 'Missing MCP credential');

  const auth = await mcpCredentialService.authenticate(header.slice(7));
  if (!auth) return rpcError(res, 401, 'Invalid or revoked MCP credential');

  const server = buildMcpServer(auth.workspaceId, auth.name);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    // `req as any`: our Express `req.auth` augmentation differs from the SDK's AuthInfo type
    await transport.handleRequest(req as any, res, req.body);
  } catch (err) {
    console.error('MCP error', err);
    if (!res.headersSent) rpcError(res, 500, 'Internal server error');
  }
}

export const mcpMethodNotAllowed = (_req: Request, res: Response) => rpcError(res, 405, 'Method not allowed');
