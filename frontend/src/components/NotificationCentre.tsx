{/* frontend/src/components/NotificationCentre.tsx */}
import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Clock, FileText, AlertTriangle, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';

const getIcon = (notificationType: string) => {
  switch (notificationType) {
    case 'mention': case 'comment': return <MessageSquare className="text-blue-600" size={18} />;
    case 'file_uploaded': case 'attachment': return <FileText className="text-green-600" size={18} />;
    case 'warning': case 'budget': return <AlertTriangle className="text-amber-600" size={18} />;
    case 'milestone': case 'deadline': return <Clock className="text-red-600" size={18} />;
    default: return <Bell size={18} />;
  }
};

export const NotificationCentre: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    loadNotificationCount();
    const interval = setInterval(loadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getNotifications(0, 20);
      setNotifications(result.data);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  async function loadNotificationCount() {
    try {
      const result = await api.getNotifications(0, 1, true);
      setUnreadCount(result.total);
    } catch (_) {}
  }

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const clearAll = async () => {
    try {
      for (const n of notifications) {
        if (!n.is_read) {
          await api.markNotificationRead(n.id);
        }
      }
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (notification.is_read) return;
    try {
      await api.markNotificationRead(notification.id);
      setNotifications(notifications.map(n =>
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">Notifications</h4>
            <div className="flex items-center gap-2">
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700">
                Mark all read
              </button>
              <button onClick={clearAll} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getIcon(notification.notification_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{notification.title}</div>
                      <p className="text-gray-600 text-sm mt-0.5">{notification.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};