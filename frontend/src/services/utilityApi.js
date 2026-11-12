import api from './api';

export const utilityApi = {
  meterReadings: async (period) => (await api.get('/utilities/meter-readings', { params: { period } })).data,
  militaryPeriods: async (period) => (await api.get('/utilities/military-periods', { params: { period } })).data,
  recordMilitaryPeriod: async (id, data) => (await api.post(`/utilities/military-periods/${encodeURIComponent(id)}`, data)).data,
  recordMeterReading: async (maPhong, data) => (await api.post(`/utilities/rooms/${encodeURIComponent(maPhong)}/meter-readings`, data)).data,
};
