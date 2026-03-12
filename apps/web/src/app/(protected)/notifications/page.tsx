'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCircle, Mail, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Skeleton } from '@/components/common/skeleton';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

export interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [isDeletingNotification, setIsDeletingNotification] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: NotificationItem[] }>('/me/notifications');
      const items = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
      setNotifications(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('notifications.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/me/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      toast.error(t('notifications.markError'));
    }
  };

  const deleteNotification = async (id: string) => {
    setNotificationToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteNotification = async () => {
    if (!notificationToDelete) return;
    setIsDeletingNotification(true);
    try {
      await apiClient.delete(`/me/notifications/${notificationToDelete}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationToDelete));
      toast.success(t('notifications.deleteSuccess'));
      setShowDeleteConfirm(false);
      setNotificationToDelete(null);
    } catch {
      toast.error(t('notifications.deleteError'));
    } finally {
      setIsDeletingNotification(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INVITATION':
        return <Mail className="h-5 w-5 text-blue-600" />;
      case 'PAYMENT':
        return <AlertCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationMessage = (type: string, payload: Record<string, unknown> | null) => {
    switch (type) {
      case 'INVITATION':
        return t('notifications.invitationMessage', {
          workspaceName: typeof payload?.workspaceName === 'string' ? payload.workspaceName : 'N/A',
        });
      case 'PAYMENT':
        return t('notifications.paymentMessage', {
          amount:
            typeof payload?.amount === 'string' || typeof payload?.amount === 'number'
              ? payload.amount
              : 'N/A',
        });
      default:
        return t('notifications.defaultMessage');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Bell className="h-5 w-5 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Thông báo</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Quản lý tất cả thông báo của hệ thống</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-900">{t('notifications.emptyState')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('notifications.emptyDesc')}</p>
        </div>
      )}

      {/* Notifications List */}
      {!isLoading && notifications.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
            {t('notifications.total', { count: notifications.length })}
          </div>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'bg-white rounded-xl border p-4 transition-colors flex items-start gap-3',
                !notification.read
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className={
                        !notification.read
                          ? 'font-semibold text-gray-900'
                          : 'font-medium text-gray-900'
                      }
                    >
                      {getNotificationMessage(notification.type, notification.payload)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  {!notification.read && (
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                  )}
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Đánh dấu đã đọc"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notification.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xóa thông báo"
        message="Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        isDangerous
        isLoading={isDeletingNotification}
        onConfirm={handleConfirmDeleteNotification}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setNotificationToDelete(null);
        }}
      />
    </div>
  );
}
