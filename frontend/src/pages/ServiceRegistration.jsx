import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, Loader2, PackageCheck, Wifi } from 'lucide-react';
import { authApi } from '../services/authApi';
import { housingApi } from '../services/housingApi';

const SERVICES = [
  { code: 'WIFI', name: 'Đăng ký Wi-Fi', description: 'Gửi yêu cầu cấp hoặc cập nhật quyền truy cập Wi-Fi KTX.', Icon: Wifi },
  { code: 'LAUNDRY', name: 'Dịch vụ giặt sấy', description: 'Đăng ký sử dụng dịch vụ giặt sấy tại khu nội trú.', Icon: PackageCheck },
  { code: 'PARKING', name: 'Đăng ký gửi xe', description: 'Gửi yêu cầu đăng ký chỗ gửi xe trong KTX.', Icon: Check },
];
const STATUS = { PENDING: 'Chờ xác nhận', APPROVED: 'Đã xác nhận', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn tất', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };

const ServiceRegistration = () => {
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [selectedService, setSelectedService] = useState('WIFI');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMine = async () => {
    const data = await housingApi.myServiceRegistrations();
    setRegistrations(data.registrations || []);
    setCatalog(data.catalog || {});
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError('');
    Promise.all([authApi.me(), housingApi.myServiceRegistrations()]).then(([profile, data]) => {
      if (!active) return;
      setContract(profile.user.currentContract || null);
      setRegistrations(data.registrations || []);
      setCatalog(data.catalog || {});
      setLoadFailed(false);
    }).catch((requestError) => {
      if (active) {
        setError(requestError.response?.data?.message || 'Không thể tải đăng ký dịch vụ.');
        setLoadFailed(true);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryCount]);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await housingApi.createServiceRegistration({ serviceCode: selectedService, note });
      setNote(''); setNotice('Đăng ký đã được gửi và đang chờ xác nhận.');
      try { await loadMine(); } catch { setError('Đăng ký đã gửi, nhưng chưa tải lại được danh sách. Hãy thử làm mới trang.'); }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể đăng ký dịch vụ.');
    } finally { setBusy(false); }
  };

  const cancel = async (id) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await housingApi.cancelServiceRegistration(id);
      setNotice('Đã hủy đăng ký.');
      try { await loadMine(); } catch { setError('Đã hủy đăng ký, nhưng chưa tải lại được danh sách. Hãy thử làm mới trang.'); }
    }
    catch (requestError) { setError(requestError.response?.data?.message || 'Không thể hủy đăng ký.'); }
    finally { setBusy(false); }
  };

  const hasActiveContract = contract?.trangThai === 'ACTIVE';

  return <main className="bg-slate-50 px-4 py-6 text-slate-800">
    <div className="mx-auto max-w-3xl space-y-5">
      <button onClick={() => navigate('/student-portal')} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700"><ArrowLeft className="h-4 w-4" />Về trang chủ</button>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><PackageCheck className="h-5 w-5" /></span><div><h1 className="text-xl font-bold">Đăng ký dịch vụ KTX</h1><p className="mt-1 text-sm text-slate-500">Gửi yêu cầu và theo dõi xác nhận từ đơn vị phụ trách.</p></div></div>
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {loading ? <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải hồ sơ và danh sách dịch vụ…</div> : loadFailed ? <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><p>Chưa tải được hồ sơ dịch vụ.</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-2 font-semibold underline underline-offset-2">Thử tải lại</button></div> : !hasActiveContract ? <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Bạn cần hợp đồng lưu trú đang hiệu lực để đăng ký dịch vụ.</p><p className="mt-1">Khi Ban quản lý xác nhận hợp đồng, các dịch vụ KTX sẽ mở tại đây.</p><button type="button" onClick={() => navigate('/my-room')} className="mt-3 font-semibold text-amber-950 underline underline-offset-2">Xem tình trạng phòng</button></div> : <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">{SERVICES.map(({ code, name, description, Icon }) => <button type="button" key={code} disabled={busy} aria-pressed={selectedService === code} onClick={() => setSelectedService(code)} className={`rounded-xl border-2 p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${selectedService === code ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}><span className={`mb-3 inline-flex rounded-lg p-2 ${selectedService === code ? 'bg-white text-blue-700' : 'bg-slate-50 text-slate-600'}`}><Icon className="h-5 w-5" /></span><span className="block font-semibold">{name}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></button>)}</div>
          <label className="block text-sm font-medium">Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span><textarea maxLength={500} rows="3" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Thông tin thêm cho đơn vị phụ trách." /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{note.length}/500</span></label>
          <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? 'Đang gửi…' : 'Gửi đăng ký'}</button>
        </form>}
        {contract && <p className="mt-5 border-t pt-4 text-xs text-slate-500">Hợp đồng {contract.maHopDong} · Phòng {contract.soPhong || contract.maPhong}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">Đăng ký của tôi</h2><p className="mt-1 text-xs text-slate-500">Cập nhật trạng thái các yêu cầu đã gửi</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{registrations.length}</span></div>{loading ? <p className="flex items-center gap-2 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải đăng ký…</p> : loadFailed ? <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Không tải được danh sách. Hãy thử lại ở phía trên.</div> : registrations.length === 0 ? <div className="rounded-xl bg-slate-50 p-5 text-center"><Clock3 className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-700">Chưa có đăng ký dịch vụ</p><p className="mt-1 text-xs text-slate-500">Yêu cầu của bạn sẽ được lưu ở đây sau khi gửi.</p></div> : <div className="divide-y">{registrations.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="font-semibold">{catalog[item.serviceCode] || item.serviceName}</p><p className="mt-1 text-xs text-slate-500">{!item.createdAt || Number.isNaN(new Date(item.createdAt).getTime()) ? 'Ngày gửi chưa cập nhật' : new Date(item.createdAt).toLocaleString('vi-VN')} · Hợp đồng {item.maHopDong}</p>{item.note && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">Nội dung đăng ký: {item.note}</p>}{item.staffNote && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Phản hồi đơn vị dịch vụ: {item.staffNote}</p>}</div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : item.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-800' : item.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' : item.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : item.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>{STATUS[item.status] || item.status}</span>{item.status === 'PENDING' && <button type="button" disabled={busy} onClick={() => cancel(item.id)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Hủy</button>}</div></article>)}</div>}</section>
    </div>
  </main>;
};

export default ServiceRegistration;
