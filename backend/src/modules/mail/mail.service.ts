import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '../../config/config.service';
import { ServiceRequest } from '../../entities/service-request.entity';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    if (this.configService.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.smtpHost,
        port: this.configService.smtpPort,
        secure: this.configService.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: this.configService.smtpUser,
          pass: this.configService.smtpPass,
        },
      });
      this.logger.log(
        `📧 MailService initialized with custom SMTP server: ${this.configService.smtpHost}`,
      );
    } else {
      this.logger.log(
        '⚠️ No SMTP configuration found. Generating Ethereal test account...',
      );
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.logger.log(
          `📧 MailService initialized with Ethereal Test Account`,
        );
        this.logger.log(`👉 User: ${testAccount.user}`);
        this.logger.log(`👉 Pass: ${testAccount.pass}`);
        this.logger.log(`👉 Preview URL: https://ethereal.email/messages`);
      } catch (err) {
        this.logger.error('Failed to generate Ethereal test account', err);
      }
    }
  }

  async sendServiceRequestUpdate(to: string, serviceRequest: ServiceRequest) {
    if (!this.transporter) {
      this.logger.warn('Transporter not initialized. Cannot send email.');
      return;
    }

    const subject = `Service Request Update - #${serviceRequest.id}`;
    const html = `
      <h2>Service Request Updated</h2>
      <p>Your service request <strong>#${serviceRequest.id}</strong> has been updated.</p>
      <ul>
        <li><strong>Status:</strong> ${serviceRequest.status}</li>
        <li><strong>Description:</strong> ${serviceRequest.description}</li>
        ${serviceRequest.technician ? `<li><strong>Technician:</strong> ${serviceRequest.technician.name}</li>` : ''}
        ${serviceRequest.scheduled_date ? `<li><strong>Scheduled Date:</strong> ${serviceRequest.scheduled_date.toString()}</li>` : ''}
        ${serviceRequest.technician_notes ? `<li><strong>Notes:</strong> ${serviceRequest.technician_notes}</li>` : ''}
      </ul>
      <p>Please check the portal for more details.</p>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendServiceRequestCreated(to: string, serviceRequest: ServiceRequest) {
    if (!this.transporter) {
      this.logger.warn('Transporter not initialized. Cannot send email.');
      return;
    }

    const subject = `Service Request Received - #${serviceRequest.id}`;
    const html = `
      <h2>Service Request Received</h2>
      <p>We have received your service request.</p>
      <ul>
        <li><strong>ID:</strong> #${serviceRequest.id}</li>
        <li><strong>Status:</strong> ${serviceRequest.status}</li>
        <li><strong>Asset:</strong> ${serviceRequest.asset ? serviceRequest.asset.name : 'N/A'}</li>
        <li><strong>Description:</strong> ${serviceRequest.description}</li>
      </ul>
      <p>We will update you as soon as a technician is assigned.</p>
    `;

    await this.sendMail(to, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string) {
    try {
      const from =
        this.configService.smtpFrom || '"Service Desk" <no-reply@example.com>';
      const info: any = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      this.logger.log(`Message sent: ${info.messageId}`);

      // If using Ethereal, log the preview URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`📬 Preview URL: ${previewUrl}`);
      }
    } catch (error: any) {
      this.logger.error(`Error sending email to ${to}`, error);
    }
  }
}
