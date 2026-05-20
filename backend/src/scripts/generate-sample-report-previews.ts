import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import * as nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

interface SampleRequest {
  id: string;
  status: 'RESOLVED' | 'CLOSED';
  company: string;
  client: string;
  email: string;
  asset: string;
  model: string;
  serial: string;
  location: string;
  description: string;
  technician: string;
  notes: string;
  previous: Array<{
    id: string;
    status: string;
    description: string;
    technician: string;
  }>;
  timeline: Array<{
    at: string;
    event: string;
    summary: string;
  }>;
}

const samples: SampleRequest[] = [
  {
    id: 'sample-sr-001',
    status: 'RESOLVED',
    company: 'TechCorp Facilities',
    client: 'Alice Morgan',
    email: 'alice.preview@example.com',
    asset: 'Server Rack A1',
    model: 'Dell PowerEdge R750',
    serial: 'R750-A1-2026',
    location: 'Data Center Room 2',
    description: 'Intermittent temperature alerts on rack A1.',
    technician: 'Sarah Martinez',
    notes:
      'Cleaned filters, improved cable airflow, and verified stable temperatures under load.',
    previous: [],
    timeline: [
      {
        at: '2026-05-18T08:15:00.000Z',
        event: 'CREATED',
        summary: 'Service request submitted by client',
      },
      {
        at: '2026-05-18T09:00:00.000Z',
        event: 'ASSIGNED',
        summary: 'Technician assignment updated',
      },
      {
        at: '2026-05-18T13:40:00.000Z',
        event: 'STATUS_CHANGED',
        summary: 'Status changed from IN_PROGRESS to RESOLVED',
      },
    ],
  },
  {
    id: 'sample-sr-002',
    status: 'CLOSED',
    company: 'TechCorp Facilities',
    client: 'Ben Carter',
    email: 'ben.preview@example.com',
    asset: 'Core Router 7',
    model: 'Cisco ISR 4451',
    serial: 'ISR4451-CORE-7',
    location: 'Network Closet East',
    description: 'Packet loss reported for east-wing clients.',
    technician: 'James Tan',
    notes:
      'Replaced failing patch cable, updated port label, and confirmed packet loss returned to zero.',
    previous: [],
    timeline: [
      {
        at: '2026-05-17T02:25:00.000Z',
        event: 'CREATED',
        summary: 'Service request submitted by client',
      },
      {
        at: '2026-05-17T03:10:00.000Z',
        event: 'STATUS_CHANGED',
        summary: 'Status changed from SCHEDULED to IN_PROGRESS',
      },
      {
        at: '2026-05-17T05:30:00.000Z',
        event: 'STATUS_CHANGED',
        summary: 'Status changed from RESOLVED to CLOSED',
      },
    ],
  },
  {
    id: 'sample-sr-003',
    status: 'RESOLVED',
    company: 'TechCorp Facilities',
    client: 'Chloe Wang',
    email: 'chloe.preview@example.com',
    asset: 'A/C Unit 12',
    model: 'Daikin SkyAir',
    serial: 'DAI-AC12-9044',
    location: 'Main Office Floor 4',
    description: 'A/C unit not cooling consistently after lunch hours.',
    technician: 'Emily Chen',
    notes:
      'Replaced capacitor and cleaned condenser coil. Unit holds target temperature.',
    previous: [
      {
        id: 'sample-sr-003-a',
        status: 'RESOLVED',
        description: 'Initial inspection found capacitor degradation.',
        technician: 'Emily Chen',
      },
    ],
    timeline: [
      {
        at: '2026-05-16T10:00:00.000Z',
        event: 'CREATED',
        summary: 'Follow-up service request created',
      },
      {
        at: '2026-05-16T11:15:00.000Z',
        event: 'RESCHEDULED',
        summary: 'Service request schedule updated',
      },
      {
        at: '2026-05-16T16:45:00.000Z',
        event: 'STATUS_CHANGED',
        summary: 'Status changed from IN_PROGRESS to RESOLVED',
      },
    ],
  },
  {
    id: 'sample-sr-004',
    status: 'RESOLVED',
    company: 'Northwind Operations',
    client: 'Dina Patel',
    email: 'dina.preview@example.com',
    asset: 'Lobby Kiosk 3',
    model: 'Elo I-Series',
    serial: 'ELO-K3-1188',
    location: 'Building A Lobby',
    description: 'Touchscreen input intermittently fails.',
    technician: 'Omar Reyes',
    notes:
      'Calibrated panel, reseated internal connector, and applied firmware update.',
    previous: [],
    timeline: [
      {
        at: '2026-05-15T07:45:00.000Z',
        event: 'CREATED',
        summary: 'Service request submitted by client',
      },
      {
        at: '2026-05-15T08:30:00.000Z',
        event: 'TECHNICIAN_NOTES_UPDATED',
        summary: 'Technician notes updated',
      },
      {
        at: '2026-05-15T12:20:00.000Z',
        event: 'STATUS_CHANGED',
        summary: 'Status changed from IN_PROGRESS to RESOLVED',
      },
    ],
  },
  {
    id: 'sample-sr-005',
    status: 'CLOSED',
    company: 'Northwind Operations',
    client: 'Evan Brooks',
    email: 'evan.preview@example.com',
    asset: 'Backup NAS 2',
    model: 'Synology RS3621xs+',
    serial: 'SYN-BNAS2-4421',
    location: 'Server Room B',
    description: 'Nightly backup job failing on volume 2.',
    technician: 'Sarah Martinez',
    notes:
      'Rebuilt degraded array, replaced disk bay 5, and confirmed successful backup cycle.',
    previous: [
      {
        id: 'sample-sr-005-a',
        status: 'RESOLVED',
        description: 'Initial degraded disk warning investigation.',
        technician: 'Sarah Martinez',
      },
      {
        id: 'sample-sr-005-b',
        status: 'RESOLVED',
        description: 'Follow-up to confirm replacement disk compatibility.',
        technician: 'James Tan',
      },
    ],
    timeline: [
      {
        at: '2026-05-14T21:00:00.000Z',
        event: 'CREATED',
        summary: 'Follow-up service request created',
      },
      {
        at: '2026-05-15T01:00:00.000Z',
        event: 'CLIENT_MEDIA_ADDED',
        summary: 'Client added screenshot of failed backup job',
      },
      {
        at: '2026-05-15T06:10:00.000Z',
        event: 'STATUS_CHANGED',
        summary: 'Status changed from RESOLVED to CLOSED',
      },
    ],
  },
];

async function main() {
  const account = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  const reportsDir = join(
    process.cwd(),
    'reports',
    'service-request-completion',
  );
  await mkdir(reportsDir, { recursive: true });

  console.log(`Ethereal user: ${account.user}`);
  console.log(`Ethereal pass: ${account.pass}`);

  for (const sample of samples) {
    const pdf = await renderPdf(sample);
    const info = await transporter.sendMail({
      from: '"Service Desk" <no-reply@example.com>',
      to: sample.email,
      subject: `Service Request Completion Report - #${sample.id}`,
      html: `<p>Your sample completion report for <strong>#${sample.id}</strong> is attached.</p>`,
      attachments: [
        {
          filename: `service-request-${sample.id}-completion-report.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${sample.asset
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${sample.status}-${sample.id}.pdf`;
    const filePath = join(reportsDir, filename);
    await writeFile(filePath, pdf);

    console.log(`Saved ${sample.id}: ${filePath}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Email preview ${sample.id}: ${previewUrl}`);
    }
  }
}

function renderPdf(sample: SampleRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    title(doc, 'Service Request Completion Report');
    kv(doc, 'Company', sample.company);
    kv(doc, 'Generated', new Date().toISOString());

    section(doc, 'Client');
    kv(doc, 'Name', sample.client);
    kv(doc, 'Email', sample.email);

    section(doc, 'Asset');
    kv(doc, 'Name', sample.asset);
    kv(doc, 'Model', sample.model);
    kv(doc, 'Serial Number', sample.serial);
    kv(doc, 'Location', sample.location);

    section(doc, 'Chain Summary');
    kv(doc, 'Previous Requests', String(sample.previous.length));
    kv(doc, 'Completed Request', sample.id);

    if (sample.previous.length > 0) {
      section(doc, 'Previous Service Requests');
      for (const previous of sample.previous) {
        doc.font('Helvetica-Bold').fontSize(11).text(`#${previous.id}`);
        kv(doc, 'Status', previous.status);
        kv(doc, 'Description', previous.description);
        kv(doc, 'Technician', previous.technician);
        doc.moveDown(0.75);
      }
    }

    section(doc, 'Completed Service Request');
    kv(doc, 'ID', sample.id);
    kv(doc, 'Status', sample.status);
    kv(doc, 'Description', sample.description);
    kv(doc, 'Technician', sample.technician);
    kv(doc, 'Technician Notes', sample.notes);

    section(doc, 'Timeline');
    for (const event of sample.timeline) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`${event.at} - ${event.event}`);
      doc.font('Helvetica').fontSize(10).text(event.summary);
      doc.moveDown(0.5);
    }

    section(doc, 'Client Media');
    doc.font('Helvetica').fontSize(10).text('None');
    section(doc, 'Technician Media');
    doc.font('Helvetica').fontSize(10).text('None');

    doc.end();
  });
}

function title(doc: PDFKit.PDFDocument, text: string) {
  doc.font('Helvetica-Bold').fontSize(20).text(text);
  doc.moveDown();
}

function section(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown();
  doc.font('Helvetica-Bold').fontSize(14).text(text);
  doc.moveDown(0.25);
}

function kv(doc: PDFKit.PDFDocument, key: string, value: string) {
  doc.font('Helvetica-Bold').fontSize(10).text(`${key}: `, {
    continued: true,
  });
  doc.font('Helvetica').fontSize(10).text(value);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
