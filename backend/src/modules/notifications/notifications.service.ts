import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../user/entities/user.entity';

export interface SweepCompletedEvent {
  userId: string;
  amount: string;
  publicKey: string;
  timestamp: Date;
}

export interface ClaimUpdatedEvent {
  userId: string;
  claimId: string;
  status: string;
  claimAmount: number;
  notes?: string;
  timestamp: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Listen to sweep.completed event and create notifications
   */
  @OnEvent('sweep.completed')
  async handleSweepCompleted(event: SweepCompletedEvent) {
    this.logger.log(
      `Processing sweep.completed event for user ${event.userId}`,
    );

    try {
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(
          `User ${event.userId} not found for sweep notification`,
        );
        return;
      }

      const preferences = await this.getOrCreatePreferences(event.userId);

      // Create in-app notification
      if (preferences.inAppNotifications) {
        await this.createNotification({
          userId: event.userId,
          type: NotificationType.SWEEP_COMPLETED,
          title: 'Account Sweep Completed',
          message: `Successfully swept ${event.amount} to your savings account.`,
          metadata: {
            amount: event.amount,
            publicKey: event.publicKey,
            timestamp: event.timestamp,
          },
        });
      }

      // Send email notification
      if (preferences.emailNotifications && preferences.sweepNotifications) {
        await this.mailService.sendSweepCompletedEmail(
          user.email,
          user.name || 'User',
          event.amount,
        );
      }

      this.logger.log(`Sweep notification processed for user ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Error processing sweep.completed event for user ${event.userId}`,
        error,
      );
    }
  }

  /**
   * Listen to claim.updated event and create notifications
   */
  @OnEvent('claim.updated')
  async handleClaimUpdated(event: ClaimUpdatedEvent) {
    this.logger.log(
      `Processing claim.updated event for claim ${event.claimId}`,
    );

    try {
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(
          `User ${event.userId} not found for claim notification`,
        );
        return;
      }

      const preferences = await this.getOrCreatePreferences(event.userId);

      // Determine notification type based on claim status
      let notificationType = NotificationType.CLAIM_UPDATED;
      let title = 'Claim Status Updated';
      let message = `Your claim has been ${event.status.toLowerCase()}.`;

      if (event.status === 'APPROVED') {
        notificationType = NotificationType.CLAIM_APPROVED;
        title = 'Claim Approved';
        message = `Your claim for $${event.claimAmount} has been approved.`;
      } else if (event.status === 'REJECTED') {
        notificationType = NotificationType.CLAIM_REJECTED;
        title = 'Claim Rejected';
        message = `Your claim for $${event.claimAmount} has been rejected.`;
        if (event.notes) {
          message += ` Reason: ${event.notes}`;
        }
      }

      // Create in-app notification
      if (preferences.inAppNotifications) {
        await this.createNotification({
          userId: event.userId,
          type: notificationType,
          title,
          message,
          metadata: {
            claimId: event.claimId,
            status: event.status,
            claimAmount: event.claimAmount,
            notes: event.notes,
            timestamp: event.timestamp,
          },
        });
      }

      // Send email notification
      if (preferences.emailNotifications && preferences.claimNotifications) {
        await this.mailService.sendClaimStatusEmail(
          user.email,
          user.name || 'User',
          event.status,
          event.claimAmount,
          event.notes,
        );
      }

      this.logger.log(
        `Claim notification processed for claim ${event.claimId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing claim.updated event for claim ${event.claimId}`,
        error,
      );
    }
  }

  /**
   * Create a notification in the database
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || null,
      read: false,
    });

    return await this.notificationRepository.save(notification);
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return { notifications, total };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    await this.notificationRepository.update(
      { id: notificationId },
      { read: true },
    );

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true },
    );
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  /**
   * Get or create notification preferences for user
   */
  async getOrCreatePreferences(
    userId: string,
  ): Promise<NotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferenceRepository.create({ userId });
      preferences = await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    let preferences = await this.getOrCreatePreferences(userId);

    Object.assign(preferences, updates);
    preferences = await this.preferenceRepository.save(preferences);

    return preferences;
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository.delete({
      createdAt: { $lt: cutoffDate } as any,
    });

    this.logger.log(
      `Deleted ${result.affected} notifications older than ${daysOld} days`,
    );
  }
}
