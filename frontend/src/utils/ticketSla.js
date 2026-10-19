export const SLA_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Sự cố nhẹ · SLA 24 giờ', hours: 24 },
  { value: 'MEDIUM', label: 'Sự cố nặng · SLA 48 giờ', hours: 48 },
  { value: 'HIGH', label: 'Sự cố nặng, ưu tiên cao · SLA 72 giờ', hours: 72 },
];

export const SLA_STATE_LABELS = {
  ON_TRACK: 'Trong hạn',
  DUE_SOON: 'Sắp đến hạn',
  OVERDUE: 'Trễ hạn',
  MET: 'Hoàn thành đúng hạn',
  BREACHED: 'Hoàn thành trễ hạn',
  CANCELLED: 'Đã hủy',
};

export const SLA_STATE_CLASSES = {
  ON_TRACK: 'bg-emerald-100 text-emerald-800',
  DUE_SOON: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-rose-100 text-rose-800',
  MET: 'bg-emerald-100 text-emerald-800',
  BREACHED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

export const getTicketSla = (ticket, now = Date.now()) => {
  const stored = ticket?.sla || {};
  const deadlineAt = stored.deadlineAt || ticket?.slaDeadlineAt;
  if (!deadlineAt) return null;

  const deadlineMs = new Date(deadlineAt).getTime();
  if (Number.isNaN(deadlineMs)) return null;

  const resolvedAt = stored.resolvedAt || ticket?.resolvedAt || ticket?.completedAt || null;
  const nowMs = new Date(now).getTime();
  let state = 'ON_TRACK';
  if (ticket?.status === 'REJECTED') state = 'CANCELLED';
  else if (resolvedAt) state = new Date(resolvedAt).getTime() <= deadlineMs ? 'MET' : 'BREACHED';
  else if (deadlineMs <= nowMs || ticket?.slaBreachedAt || stored.breachedAt) state = 'OVERDUE';
  else if (deadlineMs - nowMs <= 6 * 60 * 60 * 1000) state = 'DUE_SOON';

  const hours = stored.hours || ticket?.slaHours || SLA_PRIORITY_OPTIONS.find((item) => item.value === ticket?.priority)?.hours || 48;
  const remainingMs = resolvedAt || state === 'CANCELLED' ? null : Math.max(0, deadlineMs - nowMs);
  const overdueMs = ['OVERDUE', 'BREACHED'].includes(state)
    ? Math.max(0, (resolvedAt ? new Date(resolvedAt).getTime() : nowMs) - deadlineMs)
    : 0;

  return { ...stored, deadlineAt: new Date(deadlineMs), resolvedAt, hours, state, remainingMs, overdueMs };
};

export const formatSlaDuration = (milliseconds, prefix = '') => {
  if (milliseconds == null) return '';
  const totalMinutes = Math.max(1, Math.ceil(Math.abs(milliseconds) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const duration = days ? `${days} ngày ${hours} giờ` : hours ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
  return `${prefix}${duration}`;
};
