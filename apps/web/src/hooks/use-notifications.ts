import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

export function useNotifications() {
  const [notifications] = useState<unknown[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const { data } = await apiClient.get('/me/notifications/count');
        if (!mounted) return;
        setUnreadCount(data?.data?.unread ?? 0);
      } catch (e) {
        // ignore - notification service might not be available
      }
    };

    // Poll notification count every 5 seconds
    fetchCount();
    const timer = setInterval(fetchCount, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return { notifications, unreadCount };
}
