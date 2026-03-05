import { useEffect, useState, useRef } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || '';

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const res = await fetch(`${apiBase}/me/notifications/count`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        setUnreadCount(json.data?.unread ?? 0);
      } catch (e) {
        // ignore
      }
    };

    // Try SSE if available
    if (typeof window !== 'undefined' && window.EventSource) {
      try {
        const es = new EventSource(`${apiBase}/me/notifications/stream`, {
          withCredentials: true,
        } as any);
        esRef.current = es;
        es.addEventListener('notifications', (ev: any) => {
          try {
            const parsed = JSON.parse(ev.data);
            setNotifications(parsed);
            setUnreadCount(parsed.filter((n: any) => !n.read).length);
          } catch (e) {}
        });
        es.onerror = () => {
          // fallback to polling
          es.close();
          esRef.current = null;
        };
      } catch (e) {
        // fail silently -> polling
      }
    }

    // Poll as backup and initial fetch
    fetchCount();
    const timer = setInterval(fetchCount, 5000);

    return () => {
      mounted = false;
      if (esRef.current) {
        esRef.current.close();
      }
      clearInterval(timer);
    };
  }, [apiBase]);

  return { notifications, unreadCount };
}
