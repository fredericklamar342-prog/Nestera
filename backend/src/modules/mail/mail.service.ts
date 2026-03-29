import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(userEmail: string, name: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: 'Welcome to Nestera!',
        template: './welcome',
        context: {
          name: name || 'there',
        },
      });
      this.logger.log(`Welcome email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${userEmail}`, error);
    }
  }

  async sendSweepCompletedEmail(
    userEmail: string,
    name: string,
    amount: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: 'Account Sweep Completed',
        template: './sweep-completed',
        context: {
          name: name || 'User',
          amount,
        },
      });
      this.logger.log(`Sweep completed email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send sweep completed email to ${userEmail}`,
        error,
      );
    }
  }

  async sendClaimStatusEmail(
    userEmail: string,
    name: string,
    status: string,
    claimAmount: number,
    notes?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: `Medical Claim ${status}`,
        template: './claim-status',
        context: {
          name: name || 'User',
          status,
          claimAmount,
          notes: notes || '',
        },
      });
      this.logger.log(`Claim status email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send claim status email to ${userEmail}`,
        error,
      );
    }
  }
}
