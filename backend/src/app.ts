import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRouter } from './routes';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { mcpMethodNotAllowed, mcpPostHandler } from './mcp/handler';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render/Railway/etc. proxy
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

  app.use('/api', apiLimiter, apiRouter);

  // MCP (Streamable HTTP). Auth = MCP credential, not user JWT.
  app.post('/mcp', apiLimiter, mcpPostHandler);
  app.get('/mcp', mcpMethodNotAllowed);
  app.delete('/mcp', mcpMethodNotAllowed);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
