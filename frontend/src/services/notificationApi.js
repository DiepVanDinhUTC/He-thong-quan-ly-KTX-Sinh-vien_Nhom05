import api from './api';

export const notificationApi = {
    mine: async () => (await api.get('/notifications/mine')).data,
    markRead: async (id) => (await api.patch(`/notifications/mine/${encodeURIComponent(id)}/read`)).data,
    markAllRead: async () => (await api.patch('/notifications/mine/read-all')).data
};
