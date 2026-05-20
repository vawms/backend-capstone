import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { In, Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestChannel,
  ServiceRequestStatus,
  ServiceRequestType,
} from '../../../entities/service-request.entity';
import {
  ServiceRequestHistory,
  ServiceRequestHistoryEventType,
} from '../../../entities/service-request-history.entity';

interface CompactServiceRequestReportItem {
  id: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  created_at: Date;
  resolved_or_closed_at?: Date;
  description: string;
  followup_reason?: string | null;
  technician_name?: string | null;
  technician_notes?: string | null;
}

interface FullServiceRequestReportItem extends CompactServiceRequestReportItem {
  scheduled_date?: Date | null;
  channel: ServiceRequestChannel;
  client_media: Array<{ url: string; kind: string }>;
  technician_media: Array<{ url: string; kind: string }>;
  timeline: ServiceRequestReportTimelineItem[];
  rating_score?: number | null;
  rating_comment?: string | null;
  rated_at?: Date | null;
}

interface ServiceRequestReportTimelineItem {
  event_type: ServiceRequestHistoryEventType;
  from_status?: ServiceRequestStatus | null;
  to_status?: ServiceRequestStatus | null;
  summary: string;
  created_at: Date;
  technician_name?: string | null;
}

interface ServiceRequestReportModel {
  generatedAt: Date;
  company: {
    name: string;
  };
  client: {
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  asset: {
    name: string;
    model: string;
    serial_number: string;
    location_address: string;
  };
  previousRequests: CompactServiceRequestReportItem[];
  completedRequest: FullServiceRequestReportItem;
}

@Injectable()
export class ServiceRequestReportService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
    @InjectRepository(ServiceRequestHistory)
    private readonly historyRepository: Repository<ServiceRequestHistory>,
  ) {}

  async generateCompletionReport(
    serviceRequestId: string,
    companyId: string,
  ): Promise<Buffer> {
    const report = await this.buildReportModel(serviceRequestId, companyId);
    return this.renderPdf(report);
  }

  async archiveCompletionReport(
    serviceRequest: ServiceRequest,
    pdf: Buffer,
  ): Promise<string> {
    const reportsDir = join(
      process.cwd(),
      'reports',
      'service-request-completion',
    );
    await mkdir(reportsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const assetName = this.safeFilename(serviceRequest.asset?.name ?? 'asset');
    const filename = `${timestamp}-${assetName}-${serviceRequest.status}-${serviceRequest.id}.pdf`;
    const filePath = join(reportsDir, filename);

    await writeFile(filePath, pdf);
    return filePath;
  }

  private async buildReportModel(
    serviceRequestId: string,
    companyId: string,
  ): Promise<ServiceRequestReportModel> {
    const completedRequest = await this.serviceRequestRepository.findOne({
      where: { id: serviceRequestId },
      relations: ['asset', 'asset.company', 'client', 'technician'],
    });

    if (!completedRequest || completedRequest.company_id !== companyId) {
      throw new NotFoundException(
        `Service request with ID ${serviceRequestId} not found`,
      );
    }

    const chain = await this.getChainEntities(completedRequest, companyId);
    const historyByRequest = await this.getHistoryByRequest(chain);
    const completedHistory = this.timelineFor(
      completedRequest,
      historyByRequest.get(completedRequest.id) ?? [],
    );
    const previousRequests = chain
      .filter((sr) => sr.id !== completedRequest.id)
      .map((sr) => this.toCompactItem(sr, historyByRequest.get(sr.id) ?? []));

    return {
      generatedAt: new Date(),
      company: {
        name: completedRequest.asset.company.name,
      },
      client: completedRequest.client
        ? {
            name: completedRequest.client.name,
            email: completedRequest.client.email,
            phone: completedRequest.client.phone,
          }
        : null,
      asset: {
        name: completedRequest.asset.name,
        model: completedRequest.asset.model,
        serial_number: completedRequest.asset.serial_number,
        location_address: completedRequest.asset.location_address,
      },
      previousRequests,
      completedRequest: {
        ...this.toCompactItem(
          completedRequest,
          historyByRequest.get(completedRequest.id) ?? [],
        ),
        scheduled_date: completedRequest.scheduled_date,
        channel: completedRequest.channel,
        client_media: completedRequest.client_media ?? [],
        technician_media: completedRequest.technician_media ?? [],
        timeline: completedHistory,
        rating_score: completedRequest.rating_score,
        rating_comment: completedRequest.rating_comment,
        rated_at: completedRequest.rated_at,
      },
    };
  }

  private async getChainEntities(
    serviceRequest: ServiceRequest,
    companyId: string,
  ): Promise<ServiceRequest[]> {
    let rootId = serviceRequest.id;
    let currentParentId = serviceRequest.parent_id;

    while (currentParentId) {
      const parent = await this.serviceRequestRepository.findOne({
        where: { id: currentParentId },
        select: ['id', 'parent_id', 'company_id'],
      });
      if (!parent || parent.company_id !== companyId) {
        break;
      }
      rootId = parent.id;
      currentParentId = parent.parent_id;
    }

    return this.serviceRequestRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.asset', 'asset')
      .leftJoinAndSelect('asset.company', 'company')
      .leftJoinAndSelect('sr.client', 'client')
      .leftJoinAndSelect('sr.technician', 'technician')
      .where(
        `sr.id IN (
          WITH RECURSIVE chain AS (
            SELECT id FROM service_requests WHERE id = :rootId AND company_id = :companyId
            UNION ALL
            SELECT child.id FROM service_requests child
            INNER JOIN chain c ON child.parent_id = c.id
          )
          SELECT id FROM chain
        )`,
        { rootId, companyId },
      )
      .orderBy('sr.created_at', 'ASC')
      .addOrderBy('sr.id', 'ASC')
      .getMany();
  }

  private async getHistoryByRequest(
    chain: ServiceRequest[],
  ): Promise<Map<string, ServiceRequestHistory[]>> {
    const ids = chain.map((sr) => sr.id);
    const historyByRequest = new Map<string, ServiceRequestHistory[]>();

    if (ids.length === 0) {
      return historyByRequest;
    }

    const history = await this.historyRepository.find({
      where: { service_request_id: In(ids) },
      relations: ['technician'],
      order: { created_at: 'ASC', id: 'ASC' },
    });

    for (const event of history) {
      const events = historyByRequest.get(event.service_request_id) ?? [];
      events.push(event);
      historyByRequest.set(event.service_request_id, events);
    }

    return historyByRequest;
  }

  private toCompactItem(
    serviceRequest: ServiceRequest,
    history: ServiceRequestHistory[],
  ): CompactServiceRequestReportItem {
    return {
      id: serviceRequest.id,
      type: serviceRequest.type,
      status: serviceRequest.status,
      created_at: serviceRequest.created_at,
      resolved_or_closed_at: this.findFinalStatusDate(history),
      description: serviceRequest.description,
      followup_reason: serviceRequest.followup_reason,
      technician_name: serviceRequest.technician?.name,
      technician_notes: serviceRequest.technician_notes,
    };
  }

  private timelineFor(
    serviceRequest: ServiceRequest,
    history: ServiceRequestHistory[],
  ): ServiceRequestReportTimelineItem[] {
    if (history.length === 0) {
      return [
        {
          event_type: ServiceRequestHistoryEventType.CREATED,
          summary:
            'Service request existed before detailed history tracking was enabled',
          created_at: serviceRequest.created_at,
        },
      ];
    }

    return history.map((event) => ({
      event_type: event.event_type,
      from_status: event.from_status,
      to_status: event.to_status,
      summary: event.summary ?? this.defaultSummary(event),
      created_at: event.created_at,
      technician_name: event.technician?.name,
    }));
  }

  private findFinalStatusDate(
    history: ServiceRequestHistory[],
  ): Date | undefined {
    return history.find(
      (event) =>
        event.event_type === ServiceRequestHistoryEventType.STATUS_CHANGED &&
        (event.to_status === ServiceRequestStatus.RESOLVED ||
          event.to_status === ServiceRequestStatus.CLOSED),
    )?.created_at;
  }

  private defaultSummary(event: ServiceRequestHistory): string {
    switch (event.event_type) {
      case ServiceRequestHistoryEventType.STATUS_CHANGED:
        return `Status changed from ${event.from_status ?? 'unknown'} to ${
          event.to_status ?? 'unknown'
        }`;
      case ServiceRequestHistoryEventType.ASSIGNED:
        return 'Technician assignment updated';
      case ServiceRequestHistoryEventType.RESCHEDULED:
        return 'Service request schedule updated';
      case ServiceRequestHistoryEventType.TECHNICIAN_NOTES_UPDATED:
        return 'Technician notes updated';
      case ServiceRequestHistoryEventType.CLIENT_MEDIA_ADDED:
        return 'Client media added';
      case ServiceRequestHistoryEventType.TECHNICIAN_MEDIA_ADDED:
        return 'Technician media added';
      case ServiceRequestHistoryEventType.FOLLOW_UP_CREATED:
        return 'Follow-up service request created';
      case ServiceRequestHistoryEventType.CREATED:
      default:
        return 'Service request created';
    }
  }

  private renderPdf(report: ServiceRequestReportModel): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.writeTitle(doc, 'Service Request Completion Report');
      this.writeKeyValue(doc, 'Company', report.company.name);
      this.writeKeyValue(doc, 'Generated', this.formatDate(report.generatedAt));

      this.writeSection(doc, 'Client');
      if (report.client) {
        this.writeKeyValue(doc, 'Name', report.client.name);
        this.writeKeyValue(doc, 'Email', report.client.email);
        this.writeKeyValue(doc, 'Phone', report.client.phone ?? 'N/A');
      } else {
        doc.text('No client details available.');
      }

      this.writeSection(doc, 'Asset');
      this.writeKeyValue(doc, 'Name', report.asset.name);
      this.writeKeyValue(doc, 'Model', report.asset.model);
      this.writeKeyValue(doc, 'Serial Number', report.asset.serial_number);
      this.writeKeyValue(doc, 'Location', report.asset.location_address);

      this.writeSection(doc, 'Chain Summary');
      this.writeKeyValue(
        doc,
        'Previous Requests',
        String(report.previousRequests.length),
      );
      this.writeKeyValue(doc, 'Completed Request', report.completedRequest.id);

      if (report.previousRequests.length > 0) {
        this.writeSection(doc, 'Previous Service Requests');
        for (const item of report.previousRequests) {
          this.writeCompactRequest(doc, item);
        }
      }

      this.writeSection(doc, 'Completed Service Request');
      this.writeFullRequest(doc, report.completedRequest);

      this.writeSection(doc, 'Timeline');
      for (const event of report.completedRequest.timeline) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`${this.formatDate(event.created_at)} - ${event.event_type}`);
        doc.font('Helvetica').fontSize(10).text(event.summary);
        if (event.from_status || event.to_status) {
          doc.text(
            `Status: ${event.from_status ?? 'N/A'} -> ${
              event.to_status ?? 'N/A'
            }`,
          );
        }
        if (event.technician_name) {
          doc.text(`Technician: ${event.technician_name}`);
        }
        doc.moveDown(0.5);
      }

      this.writeMedia(
        doc,
        'Client Media',
        report.completedRequest.client_media,
      );
      this.writeMedia(
        doc,
        'Technician Media',
        report.completedRequest.technician_media,
      );

      if (
        report.completedRequest.rating_score ||
        report.completedRequest.rating_comment ||
        report.completedRequest.rated_at
      ) {
        this.writeSection(doc, 'Rating');
        this.writeKeyValue(
          doc,
          'Score',
          report.completedRequest.rating_score?.toString() ?? 'N/A',
        );
        this.writeKeyValue(
          doc,
          'Comment',
          report.completedRequest.rating_comment ?? 'N/A',
        );
        this.writeKeyValue(
          doc,
          'Rated At',
          report.completedRequest.rated_at
            ? this.formatDate(report.completedRequest.rated_at)
            : 'N/A',
        );
      }

      doc.end();
    });
  }

  private writeTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.font('Helvetica-Bold').fontSize(20).text(title);
    doc.moveDown();
  }

  private writeSection(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).text(title);
    doc.moveDown(0.25);
  }

  private writeKeyValue(doc: PDFKit.PDFDocument, key: string, value: string) {
    doc.font('Helvetica-Bold').fontSize(10).text(`${key}: `, {
      continued: true,
    });
    doc.font('Helvetica').fontSize(10).text(value);
  }

  private writeCompactRequest(
    doc: PDFKit.PDFDocument,
    item: CompactServiceRequestReportItem,
  ) {
    doc.font('Helvetica-Bold').fontSize(11).text(`#${item.id}`);
    this.writeKeyValue(doc, 'Created', this.formatDate(item.created_at));
    this.writeKeyValue(doc, 'Status', item.status);
    if (item.resolved_or_closed_at) {
      this.writeKeyValue(
        doc,
        'Finalized',
        this.formatDate(item.resolved_or_closed_at),
      );
    }
    this.writeKeyValue(doc, 'Type', item.type);
    this.writeKeyValue(doc, 'Description', item.description);
    if (item.followup_reason) {
      this.writeKeyValue(doc, 'Follow-up Reason', item.followup_reason);
    }
    this.writeKeyValue(doc, 'Technician', item.technician_name ?? 'N/A');
    if (item.technician_notes) {
      this.writeKeyValue(doc, 'Technician Notes', item.technician_notes);
    }
    doc.moveDown(0.75);
  }

  private writeFullRequest(
    doc: PDFKit.PDFDocument,
    item: FullServiceRequestReportItem,
  ) {
    this.writeCompactRequest(doc, item);
    this.writeKeyValue(doc, 'Channel', item.channel);
    this.writeKeyValue(
      doc,
      'Scheduled Date',
      item.scheduled_date ? this.formatDate(item.scheduled_date) : 'N/A',
    );
  }

  private writeMedia(
    doc: PDFKit.PDFDocument,
    title: string,
    media: Array<{ url: string; kind: string }>,
  ) {
    this.writeSection(doc, title);
    if (media.length === 0) {
      doc.font('Helvetica').fontSize(10).text('None');
      return;
    }

    for (const file of media) {
      doc.font('Helvetica').fontSize(10).text(`${file.kind}: ${file.url}`);
    }
  }

  private formatDate(value: Date): string {
    return new Date(value).toISOString();
  }

  private safeFilename(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }
}
