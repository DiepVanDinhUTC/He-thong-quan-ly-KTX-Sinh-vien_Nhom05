import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, MapPin, Star, Wrench } from 'lucide-react';
import { ticketApi } from '../services/ticketApi';
import { formatSlaDuration, getTicketSla, SLA_PRIORITY_OPTIONS, SLA_STATE_CLASSES, SLA_STATE_LABELS } from '../utils/ticketSla';

const STATUS = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', SCHEDULED: 'Đã lên lịch',
  IN_PROGRESS: 'Đang xử lý', WAITING_ACCEPTANCE: 'Chờ bạn kiểm tra và nghiệm thu', COMPLETED: 'Đã nghiệm thu', REJECTED: 'Từ chối',
};
const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN');
};

const TicketReport = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('LOW');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inspected, setInspected] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingNote, setRatingNote] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  const [slaClock, setSlaClock] = useState(() => Date.now());

  const loadMine = async () => {
    setTicketsLoading(true);
    setTicketsError('');
    try {
      setTickets((await ticketApi.mine()).tickets || []);
      return true;
    } catch (requestError) {
      setTicketsError(requestError.response?.data?.message || 'Không thể tải danh sách yêu cầu. Hãy thử tải lại.');
      return false;
    } finally {
      setTicketsLoading(false);
    }
  };
  useEffect(() => {
    loadMine();
    const timer = setInterval(() => setSlaClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleFiles = async (event) => {
    setError('');
    const files = [...(event.target.files || [])];
    if (files.length > 3 || files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
      setError('Chọn tối đa 3 ảnh JPG, PNG hoặc WEBP, mỗi ảnh không quá 2 MB.');
      event.target.value = '';
      return;
    }
    try {
      const values = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ fileName: file.name, mimeType: file.type, data: reader.result });
        reader.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
        reader.readAsDataURL(file);
      })));
      setPhotos(values);
    } catch (readError) { setError(readError.message); }
    event.target.value = '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await ticketApi.create({ category, priority, title, description, photos });
      setCreatedTicket(response.ticket);
      setCategory(''); setPriority('LOW'); setTitle(''); setDescription(''); setPhotos([]);
      await loadMine();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không gửi được yêu cầu sửa chữa.');
    } finally { setBusy(false); }
  };

  const selectTicket = async (id) => {
    setSelectedId(id);
    setSelectedTicket(null);
    setInspected(false);
    setRating(5);
    setRatingNote('');
    setReworkReason('');
    setError('');
    setNotice('');
    setDetailBusy(true);
    try {
      const response = await ticketApi.mineDetail(id);
      setSelectedTicket(response.ticket);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không tải được chi tiết yêu cầu.');
    } finally { setDetailBusy(false); }
  };

  const finishStudentAction = async (action, successMessage) => {
    if (!selectedTicket) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action(selectedTicket.id);
      setNotice(successMessage);
      setInspected(false);
      setReworkReason('');
      try {
        const details = await ticketApi.mineDetail(selectedTicket.id);
        setSelectedTicket(details.ticket);
      } catch {
        setSelectedTicket(null);
        setError('Đã lưu thao tác. Không tải lại được chi tiết; hãy chọn ticket để thử lại.');
      }
      await loadMine();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không cập nhật được yêu cầu sửa chữa.');
    } finally { setBusy(false); }
  };

  return <main className="bg-slate-50 px-4 py-6 text-slate-800">
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate('/student-portal')} className="mb-5 inline-flex items-center gap-2 text-sm text-blue-700"><ArrowLeft className="h-4 w-4" />Về trang chủ</button>
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3"><Wrench className="h-6 w-6 text-orange-600" /><div><h1 className="text-xl font-bold">Báo hỏng cơ sở vật chất</h1><p className="text-sm text-slate-500">Yêu cầu sẽ gắn với phòng nội trú hiện tại của bạn.</p></div></div>
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><MapPin className="mt-0.5 h-5 w-5 shrink-0" /><p>Hệ thống tự xác định tòa nhà và phòng từ hợp đồng nội trú đang hiệu lực.</p></div>
        {createdTicket && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>Đã gửi yêu cầu {createdTicket.id}. SLA dự kiến {createdTicket.sla?.hours || createdTicket.slaHours || 'đang được xác nhận'} giờ{formatDateTime(createdTicket.sla?.deadlineAt || createdTicket.slaDeadlineAt) ? `, hạn xử lý ${formatDateTime(createdTicket.sla?.deadlineAt || createdTicket.slaDeadlineAt)}` : ''}.</p></div>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">Nhóm sự cố<select required value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="">Chọn nhóm sự cố</option><option value="dien">Điện</option><option value="nuoc">Nước</option><option value="dieu-hoa">Điều hòa</option><option value="noi-that">Nội thất</option><option value="khac">Khác</option></select></label>
          <label className="block text-sm font-semibold">Mức độ sự cố<select required value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">{SLA_PRIORITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Thời hạn xử lý dự kiến sẽ được tính theo mức độ; Ban quản lý có thể xác nhận lại khi tiếp nhận.</span></label>
          <label className="block text-sm font-semibold">Tên thiết bị / sự cố<input required minLength="3" maxLength="160" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Ví dụ: Vòi nước bị rò rỉ" /></label>
          <label className="block text-sm font-semibold">Mô tả<textarea required minLength="5" maxLength="2000" rows="4" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Mô tả biểu hiện, thời điểm xảy ra và lưu ý khi sửa chữa…" /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{description.length}/2000</span></label>
          <div><p className="mb-2 text-sm font-semibold">Ảnh hiện trạng <span className="font-normal text-slate-500">(bắt buộc, tối đa 3 ảnh, 2 MB mỗi ảnh)</span></p><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50"><ImagePlus className="h-4 w-4 text-blue-700" />Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="sr-only" /></label>{photos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-md">{photos.map((photo, index) => <div key={`${photo.fileName}-${index}`} className="group relative overflow-hidden rounded-xl border bg-white"><img src={photo.data} alt={`Ảnh hiện trạng ${index + 1}: ${photo.fileName}`} className="aspect-square w-full object-cover" /><button type="button" onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`Xóa ảnh ${photo.fileName}`} className="absolute right-1 top-1 rounded-full bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100">Xóa</button></div>)}</div>}<p className="mt-2 text-xs text-slate-500">Ảnh giúp đội ngũ kỹ thuật xác định sự cố trước khi đến kiểm tra.</p></div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <button disabled={busy || photos.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Gửi phiếu báo hỏng</button>
        </form>
      </section>
      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
        <h2 className="mb-4 font-bold">Yêu cầu đã gửi</h2>
        {ticketsLoading ? <p className="flex items-center gap-2 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải yêu cầu…</p> : ticketsError ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><p>{ticketsError}</p><button type="button" onClick={loadMine} className="mt-2 font-semibold underline underline-offset-2">Tải lại danh sách</button></div> : tickets.length === 0 ? <div className="rounded-xl bg-slate-50 p-5 text-center"><Wrench className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 font-medium text-slate-700">Bạn chưa gửi yêu cầu sửa chữa nào</p><p className="mt-1 text-sm text-slate-500">Khi cần hỗ trợ trong phòng, hãy điền thông tin sự cố ở biểu mẫu phía trên.</p></div> : <div className="space-y-3">{tickets.map((ticket) => { const sla = getTicketSla(ticket, slaClock); return <article key={ticket.id} className={`rounded-lg border p-3 ${selectedId === ticket.id ? 'border-blue-400 bg-blue-50/40' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{ticket.title}</p><p className="text-xs text-slate-500">{ticket.id} · Phòng {ticket.phong?.soPhong || ticket.maPhong}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{STATUS[ticket.status] || ticket.status}</span>{sla && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${SLA_STATE_CLASSES[sla.state]}`}>{SLA_STATE_LABELS[sla.state]}</span>}</div></div>
          {sla && <p className="mt-2 text-xs text-slate-600">Hạn SLA {sla.hours} giờ: {new Date(sla.deadlineAt).toLocaleString('vi-VN')}{sla.state === 'OVERDUE' && ` · ${formatSlaDuration(sla.overdueMs, 'Trễ ')}`}</p>}
          {ticket.appointmentAt && <p className="mt-2 text-xs text-slate-600">Lịch hẹn: {new Date(ticket.appointmentAt).toLocaleString('vi-VN')}</p>}
          {ticket.progressNote && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">Tiến độ: {ticket.progressNote}</p>}
          <button type="button" onClick={() => selectTicket(ticket.id)} className="mt-3 rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50">{ticket.status === 'WAITING_ACCEPTANCE' ? 'Kiểm tra kết quả sửa chữa' : 'Xem chi tiết'}</button>
        </article>; })}</div>}
      </section>

      {selectedId && <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
        {detailBusy && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải chi tiết ticket…</p>}
        {!detailBusy && selectedTicket && <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{selectedTicket.status === 'WAITING_ACCEPTANCE' ? 'Kiểm tra kết quả sửa chữa' : 'Chi tiết yêu cầu sửa chữa'}</h2><p className="mt-1 text-sm text-slate-600">{selectedTicket.title} · Phòng {selectedTicket.phong?.soPhong || selectedTicket.maPhong}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{STATUS[selectedTicket.status] || selectedTicket.status}</span></div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{selectedTicket.description}</p>
          {selectedTicket.appointmentAt && <p className="mt-2 text-sm text-slate-600">Lịch hẹn: {new Date(selectedTicket.appointmentAt).toLocaleString('vi-VN')}</p>}
          {selectedTicket.progressNote && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm"><p className="font-semibold text-blue-900">Ghi chú tiến độ / nghiệm thu</p><p className="mt-1 whitespace-pre-wrap text-blue-900">{selectedTicket.progressNote}</p></div>}
          {selectedTicket.studentReworkNote && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Lý do yêu cầu sửa lại gần nhất</p><p className="mt-1 whitespace-pre-wrap">{selectedTicket.studentReworkNote}</p></div>}
          {selectedTicket.compensationItem && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"><p className="font-semibold">Khoản đền bù đã cộng vào hóa đơn tháng {selectedTicket.compensationItem.invoice?.periodStart ? `${new Date(selectedTicket.compensationItem.invoice.periodStart).getUTCMonth() + 1}/${new Date(selectedTicket.compensationItem.invoice.periodStart).getUTCFullYear()}` : 'đang cập nhật'}</p><p className="mt-1 font-bold">{Number(selectedTicket.compensationItem.amount).toLocaleString('vi-VN')} ₫</p><p className="mt-1 whitespace-pre-wrap">{selectedTicket.compensationItem.description}</p></div>}
          <div className="mt-4"><h3 className="mb-2 text-sm font-semibold">Ảnh hiện trạng và ảnh hoàn thành</h3><div className="flex flex-wrap gap-3">{(selectedTicket.photos || []).map((photo) => <a key={photo.id} href={`data:${photo.mimeType};base64,${photo.data}`} target="_blank" rel="noreferrer" className="group relative"><img src={`data:${photo.mimeType};base64,${photo.data}`} alt={photo.fileName} className="h-28 w-28 rounded-lg border object-cover" /><span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/65 px-1 py-1 text-center text-[10px] text-white">{photo.kind === 'COMPLETION' ? 'Ảnh hoàn thành' : 'Ảnh hiện trạng'}</span></a>)}</div></div>

          {selectedTicket.status === 'WAITING_ACCEPTANCE' && <div className="mt-6 space-y-4 border-t pt-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Hãy kiểm tra trực tiếp tại phòng và đối chiếu ảnh kết quả trước khi nghiệm thu. Nếu sự cố chưa được xử lý triệt để, gửi yêu cầu sửa lại để nhà cung cấp tiếp tục xử lý.</div>
            <label className="flex items-start gap-2 text-sm font-medium"><input type="checkbox" checked={inspected} onChange={(event) => setInspected(event.target.checked)} className="mt-1 h-4 w-4 accent-blue-700" /><span>Tôi đã kiểm tra thực tế kết quả sửa chữa tại phòng.</span></label>
            <fieldset><legend className="mb-2 text-sm font-semibold">Đánh giá hiệu quả sửa chữa</legend><div className="flex flex-wrap items-center gap-2">{[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" onClick={() => setRating(score)} aria-label={`${score} sao`} aria-pressed={rating === score} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${rating === score ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-500'}`}><Star className={`h-4 w-4 ${rating >= score ? 'fill-amber-400 text-amber-500' : ''}`} />{score}</button>)}<span className="text-sm text-slate-600">{rating}/5 · {rating >= 4 ? 'Hiệu quả tốt' : rating === 3 ? 'Đạt một phần' : 'Chưa đạt'}</span></div></fieldset>
            <label className="block text-sm font-medium">Nhận xét (không bắt buộc)<textarea value={ratingNote} onChange={(event) => setRatingNote(event.target.value)} maxLength={1000} rows="3" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" placeholder="Ví dụ: Đã xử lý hết rò rỉ, khu vực được dọn sạch…" /></label>
            <button type="button" disabled={busy || !inspected} onClick={() => finishStudentAction((id) => ticketApi.studentAccept(id, rating, ratingNote, inspected), 'Đã nghiệm thu ticket và lưu đánh giá của bạn.')} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Đang lưu…' : 'Nghiệm thu hoàn thành'}</button>
            <form className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/50 p-4" onSubmit={(event) => { event.preventDefault(); finishStudentAction((id) => ticketApi.studentRequestRework(id, reworkReason, inspected), 'Đã gửi yêu cầu sửa lại. SLA tiếp tục được theo dõi.'); }}>
              <h3 className="font-semibold text-rose-900">Chưa đạt? Yêu cầu sửa lại</h3><label className="block text-sm font-medium text-rose-950">Nêu rõ phần chưa được xử lý<textarea required minLength={3} maxLength={1000} value={reworkReason} onChange={(event) => setReworkReason(event.target.value)} rows="3" className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 font-normal" placeholder="Mô tả phần còn hỏng hoặc chưa hoàn thành…" /></label><button disabled={busy || !inspected || reworkReason.trim().length < 3} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50">Gửi yêu cầu sửa lại</button>
            </form>
          </div>}

          {selectedTicket.status === 'COMPLETED' && selectedTicket.rating != null && <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="flex items-center gap-2 font-semibold text-emerald-900"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />Bạn đã đánh giá {selectedTicket.rating}/5 · nghiệm thu lúc {new Date(selectedTicket.studentAcceptedAt || selectedTicket.completedAt).toLocaleString('vi-VN')}</p>{selectedTicket.ratingNote && <p className="mt-2 whitespace-pre-wrap text-emerald-900">{selectedTicket.ratingNote}</p>}</div>}
        </>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      </section>}
    </div>
  </main>;
};

export default TicketReport;
