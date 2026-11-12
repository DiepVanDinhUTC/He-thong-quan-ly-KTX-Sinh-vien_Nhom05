import React, { useCallback, useEffect, useState } from 'react';
import { utilityApi } from '../services/utilityApi';

const fields = [
  ['electricityStart', 'Điện đầu kỳ (kWh)'], ['electricityEnd', 'Điện cuối kỳ (kWh)'],
  ['waterStart', 'Nước đầu kỳ (m³)'], ['waterEnd', 'Nước cuối kỳ (m³)'],
];
const date = (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

export default function MilitaryMeterReadings({ period }) {
  const [groups, setGroups] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try { setGroups((await utilityApi.militaryPeriods(period)).data || []); }
    catch (error) { setMessage(error.response?.data?.message || 'Không thể tải các đợt GDQP.'); }
  }, [period]);
  useEffect(() => { load(); }, [load]);
  const submit = async (event, group) => {
    event.preventDefault();
    setBusy(group.assignmentId); setMessage('');
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const result = await utilityApi.recordMilitaryPeriod(group.assignmentId, data);
      setMessage(result.message); await load();
    } catch (error) { setMessage(error.response?.data?.message || 'Không thể lưu chỉ số GDQP.'); }
    finally { setBusy(''); }
  };
  return <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
    <div><h2 className="font-bold text-slate-900">Chỉ số đợt GDQP 10 ngày</h2><p className="mt-1 text-sm text-slate-600">Hiển thị các đợt bắt đầu trong tháng đã chọn. Ghi chỉ số đầu và cuối sau khi kết thúc đợt.</p></div>
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
    {!groups.length && <p className="text-sm text-slate-500">Không có đợt GDQP 10 ngày trong tháng này.</p>}
    {groups.map((group) => <form key={group.assignmentId} onSubmit={(event) => submit(event, group)} className="space-y-3 rounded-xl border p-4">
      <div><p className="font-semibold">Phòng {group.phong.soPhong} · {group.phong.toaNha?.tenToaNha || group.phong.maToaNha} · {group.residentCount} học viên</p><p className="text-sm text-slate-500">{date(group.startsAt)} – {date(group.endsAt)} (mốc kết thúc không bao gồm)</p></div>
      {group.ambiguous ? <p className="text-sm text-amber-800">Đợt có chuyển phòng, kết thúc sớm hoặc chồng lấn; cần xử lý riêng.</p> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{fields.map(([name, label]) => <label key={name} className="text-xs font-medium text-slate-600">{label}<input key={`${group.assignmentId}-${name}-${group.reading?.[name] ?? 'new'}`} name={name} type="number" min="0" max="2147483647" step="1" required defaultValue={group.reading?.[name] ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>)}</div>
        <button type="submit" disabled={Boolean(busy) || new Date(group.endsAt) > new Date()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{group.reading ? 'Cập nhật chỉ số' : 'Lưu chỉ số'}</button>
      </>}
    </form>)}
  </section>;
}
