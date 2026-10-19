import api from './api';

export const utilityApi = {
  meterReadings: async (period) => (await api.get('/utilities/meter-readings', { params: { period } })).data,
  recordMeterReading: async (maPhong, data) => (await api.post(`/utilities/rooms/${encodeURIComponent(maPhong)}/meter-readings`, data)).data,
};
