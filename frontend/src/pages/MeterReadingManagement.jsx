/* global Intl */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Droplets, Loader2, RefreshCw, Search, Zap } from 'lucide-react';
import FacilitiesLayout from '../components/FacilitiesLayout';
import { utilityApi } from '../services/utilityApi';

const UTILITY_TYPES = [
  { code: 'ELECTRICITY', label: 'Điện', unit: 'kWh', Icon: Zap, color: 'amber' },
  { code: 'WATER', label: 'Nước', unit: 'm³', Icon: Droplets, color: 'blue' },
];

const currentMonth = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
};
const draftKey = (maPhong, utilityType) => `${maPhong}:${utilityType}`;

const MeterReadingManagement = () => {
  const [period, setPeriod] = useState(currentMonth);
  const [rooms, setRooms] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReadings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await utilityApi.meterReadings(period);
      const data = response.data || [];
      setRooms(data);
      setDrafts(Object.fromEntries(data.flatMap((room) => UTILITY_TYPES.map(({ code }) => {
        const reading = room.utilities?.[code] || {};
        return [draftKey(room.maPhong, code), {
          previousReading: reading.previousReading ?? '',
          currentReading: reading.currentReading ?? '',
          memo: reading.memo || '',
        }];
      }))));
    } catch (requestError) {
      setRooms([]);
      setDrafts({});
      setError(requestError.response?.data?.message || 'Không thể tải sổ chỉ số điện nước.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadReadings(); }, [loadReadings]);

  const visibleRooms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return rooms;
    return rooms.filter((room) => `${room.soPhong} ${room.maPhong} ${room.tenToaNha} ${room.maToaNha}`.toLocaleLowerCase('vi').includes(query));
  }, [rooms, search]);

  const completedCount = rooms.reduce((total, room) => total + UTILITY_TYPES.filter(({ code }) => room.utilities?.[code]?.id).length, 0);
  const requiredCount = rooms.length * UTILITY_TYPES.length;

  const updateDraft = (key, field, value) => setDrafts((current) => ({
    ...current,
    [key]: { ...current[key], [field]: value },
  }));

  const saveReading = async (room, utilityType) => {
    const key = draftKey(room.maPhong, utilityType);
    const draft = drafts[key] || {};
    if (draft.currentReading === '' || !Number.isSafeInteger(Number(draft.currentReading)) || Number(draft.currentReading) < 0) {
      setError('Nhập chỉ số cuối kỳ là số nguyên không âm.');
      return;
    }
    const reading = room.utilities?.[utilityType] || {};
    if (reading.previousReading === null && draft.previousReading === '') {
      setError('Nhập chỉ số đầu kỳ cho lần ghi đầu tiên.');
      return;
    }
    const previousReading = reading.previousReading ?? Number(draft.previousReading);
    if (!Number.isSafeInteger(Number(previousReading)) || Number(previousReading) < 0) {
      setError('Nhập chỉ số đầu kỳ cho lần ghi đầu tiên.');
      return;
    }
    if (Number(draft.currentReading) < Number(previousReading)) {
      setError('Chỉ số cuối kỳ không được nhỏ hơn chỉ số đầu kỳ.');
      return;
    }

    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await utilityApi.recordMeterReading(room.maPhong, {
        period,
        utilityType,
        currentReading: Number(draft.currentReading),
        previousReading: reading.previousReading === null ? Number(draft.previousReading) : undefined,
        memo: draft.memo,
      });
      setNotice(`Đã lưu chỉ số ${utilityType === 'ELECTRICITY' ? 'điện' : 'nước'} phòng ${room.soPhong}.`);
      await loadReadings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu chỉ số.');
    } finally {
      setBusyKey('');
    }
  };

  return <FacilitiesLayout
    title="Ghi nhận chỉ số điện nước"
    description="Ghi theo phòng và kỳ tháng; mức sử dụng tính từ lần ghi gần nhất."
    actions={<>
      <label htmlFor="meter-period" className="px-2 text-sm font-medium text-slate-600">Kỳ ghi</label>
      <input id="meter-period" type="month" max={currentMonth()} value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <button type="button" onClick={loadReadings} aria-label="Tải lại" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-4 w-4" /></button>
    </>}
  >
    <div className="space-y-5">

    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Phòng trong phạm vi</p><p className="mt-1 text-2xl font-bold text-slate-900">{rooms.length}</p></div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Đã ghi chỉ số</p><p className="mt-1 text-2xl font-bold text-emerald-700">{completedCount} <span className="text-sm font-medium text-slate-400">/ {requiredCount}</span></p></div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Còn cần ghi</p><p className="mt-1 text-2xl font-bold text-amber-700">{Math.max(0, requiredCount - completedCount)}</p></div>
    </section>

    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
        <div><h2 className="font-bold text-slate-900">Sổ ghi theo phòng</h2><p className="mt-1 text-xs text-slate-500">Chỉ phòng thuộc tòa nhà được phân công mới hiển thị.</p></div>
        <label className="relative block w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phòng hoặc tòa nhà" className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" /></label>
      </div>
      {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải chỉ số...</div>
        : visibleRooms.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">{rooms.length ? 'Không có phòng khớp với nội dung tìm kiếm.' : 'Chưa có phòng trong tòa nhà được phân công.'}</div>
          : <div className="divide-y">{visibleRooms.map((room) => <article key={room.maPhong} className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-slate-900">Phòng {room.soPhong}</h3><p className="text-xs text-slate-500">{room.tenToaNha} · {room.maToaNha}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{UTILITY_TYPES.filter(({ code }) => room.utilities?.[code]?.id).length}/2 chỉ số đã ghi</span></div>
            <div className="grid gap-3 xl:grid-cols-2">{UTILITY_TYPES.map(({ code, label, unit, Icon, color }) => {
              const reading = room.utilities?.[code] || {};
              const key = draftKey(room.maPhong, code);
              const draft = drafts[key] || { previousReading: '', currentReading: '', memo: '' };
              const consumption = draft.currentReading !== '' && draft.previousReading !== '' && Number(draft.currentReading) >= Number(draft.previousReading)
                ? Number(draft.currentReading) - Number(draft.previousReading)
                : null;
              const iconClass = color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';
              return <div key={code} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className={`rounded-lg p-2 ${iconClass}`}><Icon className="h-4 w-4" /></span><p className="font-semibold">{label}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reading.id ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{reading.id ? 'Đã ghi' : 'Chờ ghi'}</span></div>
                <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-slate-500">Chỉ số đầu kỳ ({unit})<input type="number" min="0" max="2147483647" step="1" value={draft.previousReading} readOnly={reading.previousReading !== null} onChange={(event) => updateDraft(key, 'previousReading', event.target.value)} className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-800 read-only:cursor-not-allowed" placeholder="Chỉ số ban đầu" /></label><label className="text-xs font-medium text-slate-500">Chỉ số cuối kỳ ({unit})<input type="number" min="0" max="2147483647" step="1" value={draft.currentReading} onChange={(event) => updateDraft(key, 'currentReading', event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-800" placeholder="Nhập chỉ số hiện tại" /></label></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">Mức sử dụng: <strong className="text-slate-900">{consumption === null ? '—' : `${consumption.toLocaleString('vi-VN')} ${unit}`}</strong></p><button type="button" disabled={busyKey === key} onClick={() => saveReading(room, code)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busyKey === key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{reading.id ? 'Cập nhật chỉ số' : 'Lưu chỉ số'}</button></div>
                <label className="mt-3 block text-xs font-medium text-slate-500">Ghi chú<textarea maxLength="500" value={draft.memo} onChange={(event) => updateDraft(key, 'memo', event.target.value)} rows="1" className="mt-1 w-full resize-y rounded-lg border px-3 py-2 text-sm font-normal text-slate-700" placeholder="Ví dụ: đã chụp ảnh đồng hồ" /></label>
              </div>;
            })}</div>
          </article>)}</div>}
    </section>
    </div>
  </FacilitiesLayout>;
};

export default MeterReadingManagement;
