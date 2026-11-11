import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { authController } from '../controllers/auth.controller';
import { projectController } from '../controllers/project.controller';
import { suiteController } from '../controllers/suite.controller';
import { testCaseController } from '../controllers/testcase.controller';
import { reportController } from '../controllers/report.controller';
import { mcpCredentialController } from '../controllers/mcpCredential.controller';
import * as v from '../validators';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// ---- auth
apiRouter.post('/auth/register', authLimiter, validate({ body: v.registerBody }), authController.register);
apiRouter.post('/auth/login', authLimiter, validate({ body: v.loginBody }), authController.login);
apiRouter.post('/auth/logout', requireAuth, authController.logout);
apiRouter.get('/auth/me', requireAuth, authController.me);

// everything below requires auth
apiRouter.use(requireAuth);

// ---- projects
apiRouter.get('/projects', projectController.list);
apiRouter.post('/projects', validate({ body: v.projectCreate }), projectController.create);
apiRouter.get('/projects/:id', validate({ params: v.idParams }), projectController.get);
apiRouter.put('/projects/:id', validate({ params: v.idParams, body: v.projectUpdate }), projectController.update);
apiRouter.delete('/projects/:id', validate({ params: v.idParams }), projectController.remove);

// ---- suites
apiRouter.get('/suites', validate({ query: v.suiteQuery }), suiteController.list);
apiRouter.post('/suites', validate({ body: v.suiteCreate }), suiteController.create);
apiRouter.put('/suites/:id', validate({ params: v.idParams, body: v.suiteUpdate }), suiteController.update);
apiRouter.delete('/suites/:id', validate({ params: v.idParams }), suiteController.remove);

// ---- test cases + executions
apiRouter.get('/test-cases', validate({ query: v.testCaseQuery }), testCaseController.list);
apiRouter.post('/test-cases', validate({ body: v.testCaseCreate }), testCaseController.create);
apiRouter.get('/test-cases/:id', validate({ params: v.idParams }), testCaseController.get);
apiRouter.put('/test-cases/:id', validate({ params: v.idParams, body: v.testCaseUpdate }), testCaseController.update);
apiRouter.delete('/test-cases/:id', validate({ params: v.idParams }), testCaseController.remove);
apiRouter.post('/test-cases/:id/execute', validate({ params: v.idParams, body: v.executeBody }), testCaseController.execute);
apiRouter.get('/test-cases/:id/executions', validate({ params: v.idParams }), testCaseController.executions);

// ---- reports
apiRouter.get('/reports/summary', reportController.summary);
apiRouter.get('/reports/export', validate({ query: v.reportQuery }), reportController.export);

// ---- MCP credentials (managed by logged-in users)
apiRouter.get('/mcp-credentials', mcpCredentialController.list);
apiRouter.post('/mcp-credentials', validate({ body: v.mcpCredentialCreate }), mcpCredentialController.create);
apiRouter.delete('/mcp-credentials/:id', validate({ params: v.idParams }), mcpCredentialController.revoke);
