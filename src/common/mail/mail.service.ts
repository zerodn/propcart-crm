import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailProvider: string;

  constructor(private readonly configService: ConfigService) {
    this.mailProvider = this.configService.get('MAIL_PROVIDER') || 'LOG';
  }

  async sendInvitationEmail(
    to: string,
    workspaceName: string,
    inviterPhone: string,
    acceptUrl: string,
  ): Promise<boolean> {
    try {
      const subject = `Lời mời tham gia workspace: ${workspaceName}`;
      const htmlContent = this.generateInvitationEmailHTML(workspaceName, inviterPhone, acceptUrl);

      switch (this.mailProvider) {
        case 'SENDGRID':
          return await this.sendViaEmailService(to, subject, htmlContent);
        case 'SMTP':
          return await this.sendViaSMTP(to, subject, htmlContent);
        case 'LOG':
        default:
          return this.logEmail(to, subject, htmlContent);
      }
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${to}:`, error);
      return false;
    }
  }

  async sendEmailVerificationEmail(
    to: string,
    displayName: string,
    verifyUrl: string,
  ): Promise<boolean> {
    try {
      const subject = 'Xac thuc email tai khoan PropCart CRM';
      const htmlContent = this.generateEmailVerificationHTML(displayName, verifyUrl);

      switch (this.mailProvider) {
        case 'SENDGRID':
          return await this.sendViaEmailService(to, subject, htmlContent);
        case 'SMTP':
          return await this.sendViaSMTP(to, subject, htmlContent);
        case 'LOG':
        default:
          return this.logEmail(to, subject, htmlContent);
      }
    } catch (error) {
      this.logger.error(`Failed to send email verification to ${to}:`, error);
      return false;
    }
  }

  // Stub methods that can be implemented later with actual providers
  private async sendViaEmailService(to: string, subject: string, htmlContent: string): Promise<boolean> {
    // TODO: Implement SendGrid or other service integration
    this.logger.log(`[SendGrid] Sending email to ${to}: subject=${subject}`);
    return true;
  }

  private async sendViaSMTP(to: string, subject: string, htmlContent: string): Promise<boolean> {
    // TODO: Implement Nodemailer SMTP integration
    this.logger.log(`[SMTP] Sending email to ${to}: subject=${subject}`);
    return true;
  }

  private logEmail(to: string, subject: string, htmlContent: string): boolean {
    this.logger.log(`
      ╔════════════════════════════════════════════════════════════════╗
      ║                    EMAIL NOTIFICATION LOG                      ║
      ╠════════════════════════════════════════════════════════════════╣
      ║ To:      ${to.padEnd(55)} ║
      ║ Subject: ${subject.padEnd(55)} ║
      ║ Time:    ${new Date().toISOString().padEnd(55)} ║
      ╠════════════════════════════════════════════════════════════════╣
      ║ Content:                                                       ║
      ║ ${htmlContent.substring(0, 55).padEnd(55)} ... ║
      ╚════════════════════════════════════════════════════════════════╝
    `);
    return true;
  }

  private generateInvitationEmailHTML(
    workspaceName: string,
    inviterPhone: string,
    acceptUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu"; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0066FF; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Lời mời tham gia Workspace</h1>
            </div>
            <div class="content">
              <p>Xin chào,</p>
              <p>Bạn được mời tham gia workspace <strong>${workspaceName}</strong> (từ ${inviterPhone})</p>
              <p>Nhấn nút bên dưới để chấp nhận lời mời:</p>
              <a href="${acceptUrl}" class="button">Chấp nhận Lời mời</a>
              <p>Hoặc sao chép link sau:</p>
              <p style="word-break: break-all; color: #0066FF;">${acceptUrl}</p>
              <p style="color: #666; font-size: 12px;">Link này sẽ hết hạn trong 7 ngày.</p>
              <div class="footer">
                <p>© PropCart CRM. Tất cả quyền được bảo lưu.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateEmailVerificationHTML(displayName: string, verifyUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu"; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0066FF; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Xac thuc email</h1>
            </div>
            <div class="content">
              <p>Xin chao ${displayName},</p>
              <p>Vui long nhan vao nut ben duoi de xac thuc email tai khoan PropCart CRM.</p>
              <a href="${verifyUrl}" class="button">Xac thuc email</a>
              <p>Hoac sao chep link sau:</p>
              <p style="word-break: break-all; color: #0066FF;">${verifyUrl}</p>
              <p style="color: #666; font-size: 12px;">Link nay se het han trong 15 phut.</p>
              <div class="footer">
                <p>Neu ban khong yeu cau xac thuc, hay bo qua email nay.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
