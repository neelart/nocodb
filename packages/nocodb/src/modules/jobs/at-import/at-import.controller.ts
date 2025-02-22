import { Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { GlobalGuard } from '../../../guards/global/global.guard';
import { ExtractProjectIdMiddleware } from '../../../middlewares/extract-project-id/extract-project-id.middleware';
import { SyncSource } from '../../../models';
import { NcError } from '../../../helpers/catchError';
import { JobsService } from '../jobs.service';
import { JobTypes } from '../../../interface/Jobs';

@Controller()
@UseGuards(ExtractProjectIdMiddleware, GlobalGuard)
export class AtImportController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('/api/v1/db/meta/import/airtable')
  @HttpCode(200)
  async importAirtable(@Request() req) {
    const job = await this.jobsService.activeQueue.add(JobTypes.AtImport, {
      ...req.body,
    });

    return { id: job.id, name: job.name };
  }

  @Post('/api/v1/db/meta/syncs/:syncId/trigger')
  @HttpCode(200)
  async triggerSync(@Request() req) {
    const jobs = await this.jobsService.jobList(JobTypes.AtImport);
    const fnd = jobs.find((j) => j.data.syncId === req.params.syncId);

    if (fnd) {
      NcError.badRequest('Sync already in progress');
    }

    const syncSource = await SyncSource.get(req.params.syncId);

    const user = await syncSource.getUser();

    // Treat default baseUrl as siteUrl from req object
    let baseURL = (req as any).ncSiteUrl;

    // if environment value avail use it
    // or if it's docker construct using `PORT`
    if (process.env.NC_DOCKER) {
      baseURL = `http://localhost:${process.env.PORT || 8080}`;
    }

    const job = await this.jobsService.activeQueue.add(JobTypes.AtImport, {
      syncId: req.params.syncId,
      ...(syncSource?.details || {}),
      projectId: syncSource.project_id,
      baseId: syncSource.base_id,
      authToken: '',
      baseURL,
      user: user,
    });

    return { id: job.id, name: job.name };
  }

  @Post('/api/v1/db/meta/syncs/:syncId/abort')
  @HttpCode(200)
  async abortImport(@Request() req) {
    return {};
  }
}
