import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCheck, Clock3 } from 'lucide-react';
import { notificationApi } from '../services/notificationApi';

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN');
};

const StudentNotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await notificationApi.mine();
      setNotifications(result.notifications || []);
      setUnreadCount(Number(result.unreadCount) || 0);
    } catch {
      // Keep the header usable when the notification endpoint is briefly unavailable.
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
    } catch {
      refresh();
    }
  };

  const openInvoice = async (notification) => {
    if (!notification.readAt) {
      try {
        await notificationApi.markRead(notification.id);
        setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        refresh();
      }
    }
    setOpen(false);
    navigate('/bill-payment');
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-blue-50 hover:text-blue-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && <>
        <button type="button" aria-label="Đóng thông báo" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
        <section role="dialog" aria-label="Thông báo hóa đơn" className="fixed right-3 top-16 z-50 max-h-[75vh] w-[calc(100vw_-_1.5rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:absolute md:right-0 md:top-full md:mt-2 md:w-96 md:max-w-[calc(100vw_-_2rem)]">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div><h2 className="font-bold text-slate-900">Thông báo hóa đơn</h2><p className="mt-0.5 text-xs text-slate-500">{unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Đã cập nhật'}</p></div>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><CheckCheck className="h-4 w-4" />Đánh dấu đã đọc</button>}
          </div>
          <div className="max-h-[calc(75vh_-_4rem)] overflow-y-auto">
            {notifications.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-500"><Bell className="mx-auto mb-2 h-6 w-6 text-slate-300" />Bạn chưa có thông báo nhắc nợ.</div> : notifications.map((item) => {
              const overdue = item.kind === 'OVERDUE';
              return <button key={item.id} type="button" onClick={() => openInvoice(item)} className={`block w-full border-b px-4 py-3 text-left transition hover:bg-slate-50 ${overdue ? 'border-l-4 border-l-red-600 bg-red-50/70' : 'border-l-4 border-l-transparent'} ${!item.readAt ? 'bg-blue-50/40' : ''}`}>
                <span className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded-full p-1.5 ${overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{overdue ? <AlertTriangle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${overdue ? 'text-red-800' : 'text-slate-800'}`}>{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span><span className="mt-1.5 block text-[11px] text-slate-400">{formatTime(item.createdAt)}</span></span>
                  {!item.readAt && <span aria-label="Chưa đọc" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${overdue ? 'bg-red-600' : 'bg-blue-600'}`} />}
                </span>
              </button>;
            })}
          </div>
          <button type="button" onClick={() => { setOpen(false); navigate('/bill-payment'); }} className="w-full px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50">Xem hóa đơn và thanh toán</button>
        </section>
      </>}
    </div>
  );
};

export default StudentNotificationBell;
