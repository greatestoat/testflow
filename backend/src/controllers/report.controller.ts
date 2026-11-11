import { reportService } from '../services/report.service';
import { asyncHandler, ok } from '../utils/http';

export const reportController = {
  summary: asyncHandler(async (req, res) => ok(res, await reportService.summary(req.auth!.workspaceId))),
  export: asyncHandler(async (req, res) => {
    const csv = await reportService.exportCsv(req.auth!.workspaceId, req.query.projectId as string | undefined);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="testflow-test-cases.csv"');
    res.status(200).send(csv);
  }),
};
