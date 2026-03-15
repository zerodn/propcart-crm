/**
 * Shared queue name and job type constants for the notification queue.
 * Import these instead of using raw strings to avoid typos.
 */
export const NOTIFICATION_QUEUE = 'notification';

export const NotificationJobType = {
  SEND_EMAIL: 'send-email',
  CREATE_NOTIFICATION: 'create-notification',
} as const;

export interface SendEmailJob {
  type: 'booking-request';
  to: string;
  recipientName: string;
  productName: string;
  unitCode?: string | null;
  saleName: string;
  agency?: string;
  phone: string;
  notes?: string;
}

export interface CreateNotificationJob {
  userId: string;
  notificationType: string;
  payload: Record<string, unknown>;
}
