import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Check, CheckCircle2, Clock3, ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import FacilitiesLayout from '../components/FacilitiesLayout';
import { ticketApi } from '../services/ticketApi';
import { formatSlaDuration, getTicketSla, SLA_PRIORITY_OPTIONS, SLA_STATE_CLASSES, SLA_STATE_LABELS } from '../utils/ticketSla';

const STATUS = {
  PENDING: ['Chờ duyệt', 'bg-amber-100 text-amber-800'],
  APPROVED: ['Đã duyệt', 'bg-blue-100 text-blue-800'],
  SCHEDULED: ['Đã lên lịch', 'bg-indigo-100 text-indigo-800'],
  IN_PROGRESS: ['Đang xử lý', 'bg-sky-100 text-sky-800'],
  WAITING_ACCEPTANCE: ['Chờ sinh viên nghiệm thu', 'bg-violet-100 text-violet-800'],
  COMPLETED: ['Hoàn thành', 'bg-emerald-100 text-emerald-800'],
  REJECTED: ['Từ chối', 'bg-rose-100 text-rose-800'],
};

const readPhotos = (files) => Promise.all([...files].map((file) => new Promise((resolve, reject) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    reject(new Error('Chỉ nhận ảnh JPG, PNG, WEBP tối đa 2 MB mỗi ảnh.'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve({ fileName: file.name, mimeType: file.type, data: reader.result });
  reader.onerror = () => reject(new Error(`Không đọc được ảnh ${file.name}.`));
  reader.readAsDataURL(file);
})));

const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có';
const formatInvoicePeriod = (value) => {
  if (!value) return 'Chưa xác định';
  const date = new Date(value);
  return `Tháng ${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
};

const TicketManagement = () => {
  const role = useSelector((state) => state.auth.user?.role);
  const canManage = ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'].includes(role);
  const canUpdate = ['FACILITIES_MANAGER', 'SERVICE_PROVIDER', 'ADMIN'].includes(role);
  const canOverrideCompletion = role === 'ADMIN';
  const canAssessCompensation = ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN'].includes(role);
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [priority, setPriority] = useState('MEDIUM');
  const [appointmentAt, setAppointmentAt] = useState('');
  const [appointmentNote, setAppointmentNote] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [compensationAmount, setCompensationAmount] = useState('');
  const [compensationReason, setCompensationReason] = useState('');
  const [studentAtFaultConfirmed, setStudentAtFaultConfirmed] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [slaClock, setSlaClock] = useState(() => Date.now());

  const applyTicket = (nextTicket) => {
    setTicket(nextTicket);
    setPriority(nextTicket.priority || 'MEDIUM');
    setProgressNote(nextTicket.progressNote || '');
    setAppointmentAt(nextTicket.appointmentAt ? new Date(nextTicket.appointmentAt).toISOString().slice(0, 16) : '');
    setAppointmentNote(nextTicket.appointmentNote || '');
    setCompensationAmount(nextTicket.compensationItem ? String(nextTicket.compensationItem.amount) : '');
    setCompensationReason(nextTicket.compensationItem?.description || '');
    setStudentAtFaultConfirmed(false);
  };

  const load = async (keepSelected = true) => {
    setLoading(true);
    setError('');
    try {
      const response = await ticketApi.list();
      const items = response.tickets || [];
      setTickets(items);
      const nextId = keepSelected && items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id || '';
      setSelectedId(nextId);
      if (nextId) {
        const details = await ticketApi.detail(nextId);
        applyTicket(details.ticket);
      } else {
        setTicket(null);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không tải được danh sách yêu cầu sửa chữa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, []);
  useEffect(() => {
    const timer = setInterval(() => setSlaClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const selectTicket = async (id) => {
    setSelectedId(id);
    setError('');
    try {
      const response = await ticketApi.detail(id);
      applyTicket(response.ticket);
      setPhotos([]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không tải được chi tiết yêu cầu.');
    }
  };

  const perform = async (action, successMessage) => {
    if (!ticket) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action(ticket.id);
      setNotice(successMessage);
      await load(true);
      const refreshed = await ticketApi.detail(ticket.id);
      applyTicket(refreshed.ticket);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Không thể cập nhật yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const uploadSelection = async (event) => {
    setError('');
    try {
      const selected = await readPhotos(event.target.files || []);
      if (selected.length > 3) throw new Error('Tải lên tối đa 3 ảnh cho mỗi lần cập nhật.');
      setPhotos(selected);
    } catch (uploadError) {
      setPhotos([]);
      setError(uploadError.message);
    }
    event.target.value = '';
  };

  const status = STATUS[ticket?.status] || ['Không rõ', 'bg-gray-100 text-gray-700'];
  const currentSla = getTicketSla(ticket, slaClock);
  const overdueCount = tickets.filter((item) => getTicketSla(item, slaClock)?.state === 'OVERDUE').length;

  return (
    <FacilitiesLayout title="Yêu cầu sửa chữa" description="Theo dõi và cập nhật tiến độ xử lý các sự cố cơ sở vật chất được phân công.">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[360px_1fr]">
        {overdueCount > 0 && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 lg:col-span-2">Có {overdueCount} yêu cầu đã quá thời hạn SLA. Hãy ưu tiên kiểm tra và cập nhật tiến độ.</div>}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-bold">Yêu cầu sửa chữa</h2><p className="text-xs text-slate-500">{tickets.length} yêu cầu</p></div><button onClick={() => load(true)} title="Tải lại" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-4 w-4" /></button></div>
          <div className="max-h-[75vh] overflow-y-auto p-2">
            {loading && <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải</div>}
            {!loading && tickets.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Chưa có yêu cầu nào trong phạm vi được phân công.</p>}
            {tickets.map((item) => {
              const itemStatus = STATUS[item.status] || ['Không rõ', 'bg-gray-100 text-gray-700'];
              const itemSla = getTicketSla(item, slaClock);
              return <button key={item.id} onClick={() => selectTicket(item.id)} className={`mb-2 w-full rounded-lg border p-3 text-left hover:border-blue-400 ${selectedId === item.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{item.title}</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${itemStatus[1]}`}>{itemStatus[0]}</span></div>
                <p className="mt-2 text-sm text-slate-600">Phòng {item.phong?.soPhong || item.maPhong} · {item.phong?.toaNha?.tenToaNha || item.phong?.maToaNha}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>{itemSla && <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${SLA_STATE_CLASSES[itemSla.state]}`}>{SLA_STATE_LABELS[itemSla.state]}</span>}</div>
              </button>;
            })}
          </div>
        </section>

        <section className="min-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          {!ticket ? <div className="p-10 text-center text-slate-500">{loading ? 'Đang tải yêu cầu…' : 'Chọn một yêu cầu để xem chi tiết.'}</div> : <>
            <div className="border-b p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 flex items-center gap-2"><h2 className="text-xl font-bold">{ticket.title}</h2><span className={`rounded-full px-2.5 py-1 text-xs ${status[1]}`}>{status[0]}</span></div><p className="text-sm text-slate-500">Mã {ticket.id} · {ticket.category} · Tạo lúc {formatDate(ticket.createdAt)}</p></div><div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">Phòng {ticket.phong?.soPhong || ticket.maPhong} · {ticket.phong?.toaNha?.tenToaNha || ticket.phong?.maToaNha}</div></div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{ticket.description}</p>
              <p className="mt-3 text-sm text-slate-500">Người báo: {ticket.sinhVien?.hoTen || ticket.maSinhVien} · {ticket.sinhVien?.phone || 'Không có số điện thoại'}</p>
              {ticket.rejectionReason && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Lý do từ chối: {ticket.rejectionReason}</p>}
              <div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="flex items-center gap-1 text-slate-600"><Clock3 className="h-4 w-4" />Lịch hẹn: {formatDate(ticket.appointmentAt)}</span>{ticket.appointmentNote && <span className="text-slate-600">· {ticket.appointmentNote}</span>}</div>
              {currentSla && <div className={`mt-4 rounded-xl border p-4 ${['OVERDUE', 'BREACHED'].includes(currentSla.state) ? 'border-rose-200 bg-rose-50' : currentSla.state === 'DUE_SOON' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Theo dõi SLA · {currentSla.hours} giờ</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SLA_STATE_CLASSES[currentSla.state]}`}>{SLA_STATE_LABELS[currentSla.state]}</span></div><p className="mt-1 text-sm">Hạn xử lý: {formatDate(currentSla.deadlineAt)}</p>{currentSla.state === 'OVERDUE' && <p className="mt-1 text-sm font-semibold text-rose-800">Quá hạn {formatSlaDuration(currentSla.overdueMs)}. Cảnh báo đã được ghi nhận.</p>}{currentSla.state === 'DUE_SOON' && <p className="mt-1 text-sm text-amber-900">Còn {formatSlaDuration(currentSla.remainingMs)} để hoàn thành.</p>}{['MET', 'BREACHED'].includes(currentSla.state) && <p className="mt-1 text-sm">Hoàn tất sửa chữa: {formatDate(currentSla.resolvedAt)}</p>}</div>}
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div><h3 className="mb-2 font-semibold">Ảnh hiện trạng và nghiệm thu</h3><div className="flex flex-wrap gap-3">
                {(ticket.photos || []).map((photo) => <a key={photo.id} href={`data:${photo.mimeType};base64,${photo.data}`} target="_blank" rel="noreferrer" className="group relative"><img src={`data:${photo.mimeType};base64,${photo.data}`} alt={photo.fileName} className="h-28 w-28 rounded-lg border object-cover" /><span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 px-1 py-1 text-center text-[10px] text-white">{photo.kind === 'COMPLETION' ? 'Nghiệm thu' : 'Hiện trạng'}</span></a>)}
                {ticket.photos?.length === 0 && <span className="text-sm text-slate-400">Chưa có ảnh.</span>}
              </div></div>
              {ticket.progressNote && <div className="rounded-lg bg-blue-50 p-3"><h3 className="text-sm font-semibold text-blue-900">Cập nhật gần nhất</h3><p className="mt-1 whitespace-pre-wrap text-sm text-blue-900">{ticket.progressNote}</p></div>}
              {ticket.studentReworkNote && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><h3 className="text-sm font-semibold text-amber-900">Yêu cầu sửa lại từ sinh viên</h3><p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{ticket.studentReworkNote}</p>{ticket.studentReworkAt && <p className="mt-1 text-xs text-amber-800">Gửi lúc {formatDate(ticket.studentReworkAt)}</p>}</div>}
              {ticket.rating != null && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><h3 className="text-sm font-semibold text-emerald-900">Đánh giá của sinh viên: {ticket.rating}/5</h3>{ticket.ratingNote && <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{ticket.ratingNote}</p>}</div>}
              {ticket.compensationItem && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3"><h3 className="text-sm font-semibold text-rose-900">Chi phí đền bù đã cộng vào hóa đơn</h3><p className="mt-1 text-sm font-bold text-rose-900">{Number(ticket.compensationItem.amount).toLocaleString('vi-VN')} ₫ · {formatInvoicePeriod(ticket.compensationItem.invoice?.periodStart)}</p><p className="mt-1 whitespace-pre-wrap text-sm text-rose-900">{ticket.compensationItem.description}</p><p className="mt-1 text-xs text-rose-800">Hóa đơn hiện có tổng phát sinh {Number(ticket.compensationItem.invoice?.totalAmount || 0).toLocaleString('vi-VN')} ₫ · ghi nhận lúc {formatDate(ticket.compensationItem.assessedAt)}</p></div>}

              {canManage && ticket.status === 'PENDING' && <div className="flex flex-wrap items-end gap-3 border-t pt-5"><label className="min-w-64 flex-1 text-sm font-medium">Xác nhận mức độ sự cố<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 block w-full rounded-lg border bg-white px-3 py-2">{SLA_PRIORITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button disabled={busy} onClick={() => perform((id) => ticketApi.approve(id, priority), 'Đã duyệt yêu cầu và áp dụng SLA.')} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />Duyệt & áp dụng SLA</button><button disabled={busy} onClick={() => { const reason = window.prompt('Nhập lý do từ chối:'); if (reason?.trim()) perform((id) => ticketApi.reject(id, reason), 'Đã từ chối yêu cầu.'); }} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"><X className="h-4 w-4" />Từ chối</button></div>}

              {canManage && ['APPROVED', 'SCHEDULED'].includes(ticket.status) && <form className="grid gap-3 border-t pt-5 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); if (!appointmentAt) return setError('Hãy chọn lịch hẹn sửa chữa.'); perform((id) => ticketApi.schedule(id, new Date(appointmentAt).toISOString(), appointmentNote), 'Đã cập nhật lịch hẹn.'); }}>
                <label className="text-sm font-medium">Lịch hẹn<input type="datetime-local" value={appointmentAt} onChange={(event) => setAppointmentAt(event.target.value)} required className="mt-1 block w-full rounded-lg border px-3 py-2" /></label>
                <label className="text-sm font-medium">Ghi chú<textarea value={appointmentNote} onChange={(event) => setAppointmentNote(event.target.value)} rows="1" maxLength="500" className="mt-1 block w-full rounded-lg border px-3 py-2" placeholder="Thông tin chuẩn bị / liên hệ" /></label>
                <button disabled={busy} className="self-end rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Lưu lịch</button>
              </form>}

              {canUpdate && ['SCHEDULED', 'IN_PROGRESS'].includes(ticket.status) && <form className="space-y-3 border-t pt-5" onSubmit={(event) => { event.preventDefault(); perform((id) => ticketApi.progress(id, progressNote), 'Đã cập nhật tiến độ.'); }}>
                <h3 className="font-semibold">Cập nhật tiến độ sự cố</h3><textarea required minLength="3" maxLength="2000" value={progressNote} onChange={(event) => setProgressNote(event.target.value)} rows="3" className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Mô tả công việc đã thực hiện, vật tư cần thêm, tiến độ…" /><button disabled={busy} className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50">Lưu tiến độ</button>
              </form>}

              {canUpdate && ['SCHEDULED', 'IN_PROGRESS'].includes(ticket.status) && <form className="space-y-3 border-t pt-5" onSubmit={async (event) => { event.preventDefault(); try { if (!photos.length) return setError('Tải lên ít nhất một ảnh nghiệm thu.'); await perform((id) => ticketApi.submitCompletion(id, progressNote, photos), 'Đã gửi ảnh nghiệm thu, chờ ban quản lý xác nhận.'); setPhotos([]); } catch (uploadError) { setError(uploadError.message); } }}>
                <h3 className="font-semibold">Gửi nghiệm thu hoàn thành</h3><p className="text-sm text-slate-500">Cần ảnh JPG, PNG hoặc WEBP (tối đa 3 ảnh, 2 MB mỗi ảnh). Sau khi gửi, sinh viên sẽ kiểm tra thực tế và nghiệm thu.</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-400 px-4 py-3 text-sm hover:border-blue-500"><ImagePlus className="h-4 w-4" />Chọn ảnh nghiệm thu<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadSelection} className="sr-only" /></label>
                {photos.length > 0 && <p className="text-sm text-slate-600">Đã chọn {photos.length} ảnh: {photos.map((photo) => photo.fileName).join(', ')}</p>}
                <button disabled={busy || photos.length === 0} className="ml-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Gửi nghiệm thu</button>
              </form>}

              {canAssessCompensation && ['WAITING_ACCEPTANCE', 'COMPLETED'].includes(ticket.status) && !ticket.compensationItem && <form className="space-y-3 border-t pt-5" onSubmit={(event) => { event.preventDefault(); const amount = Number(compensationAmount); if (!studentAtFaultConfirmed) return setError('Hãy xác nhận đã xác minh trách nhiệm của sinh viên.'); if (!Number.isSafeInteger(amount) || amount <= 0) return setError('Chi phí đền bù phải là số nguyên dương.'); perform((id) => ticketApi.assessCompensation(id, amount, compensationReason, studentAtFaultConfirmed), 'Đã ghi nhận chi phí đền bù và cộng vào hóa đơn tháng.'); }}>
                <h3 className="font-semibold">Ghi nhận đền bù tài sản hỏng</h3><p className="text-sm text-slate-500">Chỉ lập khoản thu sau khi kiểm tra ticket và xác định trách nhiệm; mỗi ticket chỉ được tính một lần.</p>
                <label className="block text-sm font-medium">Chi phí đền bù (₫)<input type="number" required min="1" max="1000000000" step="1" value={compensationAmount} onChange={(event) => setCompensationAmount(event.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2" placeholder="Ví dụ: 250000" /></label>
                <label className="block text-sm font-medium">Căn cứ / mô tả hư hỏng<textarea required minLength={5} maxLength={1000} value={compensationReason} onChange={(event) => setCompensationReason(event.target.value)} rows="3" className="mt-1 block w-full rounded-lg border px-3 py-2" placeholder="Mô tả tài sản hỏng, nguyên nhân và cách xác định mức đền bù…" /></label>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={studentAtFaultConfirmed} onChange={(event) => setStudentAtFaultConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-rose-700" /><span>Đã xác minh hư hỏng do lỗi sinh viên và có căn cứ xác định khoản đền bù.</span></label>
                <button disabled={busy || !studentAtFaultConfirmed || !compensationAmount || !compensationReason.trim()} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Cộng vào hóa đơn tháng</button>
              </form>}

              {ticket.status === 'WAITING_ACCEPTANCE' && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="text-sm text-slate-600">Đang chờ sinh viên kiểm tra thực tế, đánh giá hiệu quả và nghiệm thu.</p>{canOverrideCompletion && <button disabled={busy} onClick={() => perform(ticketApi.acceptCompletion, 'Quản trị viên đã xác nhận hoàn thành thay sinh viên.')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Quản trị viên xác nhận thay</button>}</div>}

              {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
              {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
              {busy && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang lưu cập nhật…</p>}
            </div>
          </>}
        </section>
      </div>
    </FacilitiesLayout>
  );
};

export default TicketManagement;
