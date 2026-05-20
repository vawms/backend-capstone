import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from '../entities/service-request.entity';
import { MailService } from '../modules/mail/mail.service';
import { ServiceRequestReportService } from '../modules/service-request/services/service-request-report.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const limit = Number(process.env.REPORT_PREVIEW_LIMIT ?? 8);
    const serviceRequestRepository = app.get<Repository<ServiceRequest>>(
      getRepositoryToken(ServiceRequest),
      { strict: false },
    );
    const reportService = app.get(ServiceRequestReportService, {
      strict: false,
    });
    const mailService = app.get(MailService, { strict: false });

    const requests = await loadPreviewRequests(serviceRequestRepository, limit);

    if (requests.length === 0) {
      console.log('No service requests with clients were found.');
      return;
    }

    for (const request of requests) {
      if (!request.client?.email) {
        continue;
      }

      const pdf = await reportService.generateCompletionReport(
        request.id,
        request.company_id,
      );
      await mailService.sendServiceRequestCompletionReport(
        request.client.email,
        request,
        pdf,
      );
      const archivedPath = await reportService.archiveCompletionReport(
        request,
        pdf,
      );

      console.log(
        `Generated ${request.status} report for ${request.id}: ${archivedPath}`,
      );
    }
  } finally {
    await app.close();
  }
}

async function loadPreviewRequests(
  repository: Repository<ServiceRequest>,
  limit: number,
): Promise<ServiceRequest[]> {
  const finalized = await basePreviewQuery(repository)
    .andWhere('sr.status IN (:...statuses)', {
      statuses: [ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED],
    })
    .take(limit)
    .getMany();

  if (finalized.length >= limit) {
    return finalized;
  }

  const seen = new Set(finalized.map((request) => request.id));
  const remaining = await basePreviewQuery(repository)
    .andWhere('sr.id NOT IN (:...seen)', {
      seen:
        seen.size > 0 ? [...seen] : ['00000000-0000-0000-0000-000000000000'],
    })
    .take(limit - finalized.length)
    .getMany();

  return [...finalized, ...remaining];
}

function basePreviewQuery(repository: Repository<ServiceRequest>) {
  return repository
    .createQueryBuilder('sr')
    .leftJoinAndSelect('sr.asset', 'asset')
    .leftJoinAndSelect('asset.company', 'company')
    .leftJoinAndSelect('sr.client', 'client')
    .leftJoinAndSelect('sr.technician', 'technician')
    .where('sr.client_id IS NOT NULL')
    .orderBy('sr.updated_at', 'DESC')
    .addOrderBy('sr.id', 'ASC');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
