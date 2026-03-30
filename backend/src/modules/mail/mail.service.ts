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

  async sendWithdrawalCompletedEmail(
    userEmail: string,
    name: string,
    amount: string,
    penalty: string,
    netAmount: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: 'Withdrawal Request Completed',
        template: './withdrawal-completed',
        context: {
          name: name || 'User',
          amount,
          penalty,
          netAmount,
        },
      });
      this.logger.log(`Withdrawal completed email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send withdrawal completed email to ${userEmail}`,
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

  async sendGoalMilestoneEmail(
    userEmail: string,
    name: string,
    goalName: string,
    percentage: number,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: `Congrats — ${percentage}% of your goal achieved!`,
        template: './goal-milestone',
        context: {
          name: name || 'User',
          goalName,
          percentage,
        },
      });
      this.logger.log(
        `Goal milestone email (${percentage}%) sent to ${userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send goal milestone email to ${userEmail}`,
        error,
      );
    }
  }

  async sendWaitlistAvailabilityEmail(
    userEmail: string,
    name: string,
    productId: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: 'A savings product you waited for is available',
        template: './waitlist-available',
        context: {
          name: name || 'User',
          productId,
        },
      });
      this.logger.log(`Waitlist availability email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send waitlist availability email to ${userEmail}`,
        error,
      );
    }
  }

  async sendSavingsAlertEmail(
    userEmail: string,
    name: string,
    message: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: 'Savings product alert',
        template: './generic-notification',
        context: {
          name: name || 'User',
          message,
        },
      });
      this.logger.log(`Savings alert email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send savings alert email to ${userEmail}`,
        error,
      );
    }
  }

  async sendRawMail(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.mailerService.sendMail({ to, subject, text });
    } catch (error) {
      this.logger.error(`Failed to send raw email to ${to}`, error);
    }
  }
}
