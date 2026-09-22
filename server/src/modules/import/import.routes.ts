import { Router } from 'express';
import type { ApiFailure, ApiSuccess } from '@hotwords/shared';
import { CsvImportError, CsvImportService, type ImportResult } from './csv-import.service.js';

export function createImportRouter(service: CsvImportService): Router {
  const router = Router();

  router.post('/csv', async (request, response) => {
    if (typeof request.body !== 'string') {
      response.status(415).json({
        success: false,
        error: { code: 'INVALID_CSV_CONTENT_TYPE', message: '请使用 text/csv 上传 CSV 内容', details: null },
      } satisfies ApiFailure);
      return;
    }
    const fileName = typeof request.headers['x-file-name'] === 'string'
      ? request.headers['x-file-name'].slice(0, 200)
      : 'upload.csv';
    const data = await service.importText(fileName, request.body);
    response.status(201).json({
      success: true,
      data,
      message: `导入完成：成功 ${data.successCount} 篇，失败 ${data.failureCount} 篇`,
    } satisfies ApiSuccess<ImportResult>);
  });

  router.get('/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new CsvImportError('导入任务 id 必须是正整数');
    const data = service.getById(id);
    if (!data) {
      response.status(404).json({
        success: false,
        error: { code: 'IMPORT_NOT_FOUND', message: '导入任务不存在', details: null },
      } satisfies ApiFailure);
      return;
    }
    response.json({ success: true, data, message: '查询成功' } satisfies ApiSuccess<ImportResult>);
  });

  router.use((error: unknown, _request: unknown, response: { status: (code: number) => { json: (body: ApiFailure) => void } }, next: (error: unknown) => void) => {
    if (error instanceof CsvImportError) {
      response.status(400).json({
        success: false,
        error: { code: 'INVALID_CSV', message: error.message, details: null },
      });
      return;
    }
    next(error);
  });
  return router;
}
