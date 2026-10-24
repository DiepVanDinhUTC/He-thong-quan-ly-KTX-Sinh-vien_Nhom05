/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Loader2, PackageCheck, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { housingApi } from '../services/housingApi';
import AdminLayout from '../components/AdminLayout';
import { useBoardWorkspace } from '../components/BoardLayout';
import { canDecideHousingRequest, housingRequestReadRoles } from '../utils/accessControl';

const HOUSING_STATUS = { PENDING: 'Chờ xử lý', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const SERVICE_STATUS = { PENDING: 'Chờ xác nhận', APPROVED: 'Đã xác nhận', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn tất', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };
const SERVICE_STATUS_CLASS = {
  PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800', COMPLETED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800', CANCELLED: 'bg-slate-100 text-slate-600',
};
const SERVICE_ACTIONS = {
  PENDING: [{ status: 'APPROVED', label: 'Duyệt' }, { status: 'REJECTED', label: 'Từ chối' }],
  APPROVED: [{ status: 'IN_PROGRESS', label: 'Bắt đầu thực hiện' }, { status: 'COMPLETED', label: 'Hoàn tất' }],
  IN_PROGRESS: [{ status: 'COMPLETED', label: 'Đánh dấu hoàn tất' }],
};

const SelfServiceManagement = ({ embedded = false, housingRequestType } = {}) => {
  const isBoardWorkspace = useBoardWorkspace();
  const isTransferReview = housingRequestType === 'TRANSFER';
  const PageHeading = embedded || isBoardWorkspace ? 'h2' : 'h1';
  const PageIntro = isBoardWorkspace ? 'section' : 'header';
  const role = useSelector((state) => state.auth.user?.role);
  const canSeeHousing = housingRequestReadRoles.includes(role);
  const canSeeServices = !isTransferReview && ['SERVICE_PROVIDER', 'BUILDING_MANAGER', 'ADMIN'].includes(role);
  const canDecideServices = canSeeServices;
  const [tab, setTab] = useState(canSeeHousing ? 'housing' : 'services');
  const [housingRequests, setHousingRequests] = useState([]);
  const [housingStatus, setHousingStatus] = useState(isTransferReview ? 'PENDING' : 'ALL');
  const [serviceRequests, setServiceRequests] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState(null);
  const [serviceDecision, setServiceDecision] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async (selectedTab = tab) => {
    setLoading(true); setError('');
    try {
      if (selectedTab === 'housing') {
        const data = await housingApi.housingRequests();
        setHousingRequests((data.requests || []).filter((item) => !housingRequestType || item.requestType === housingRequestType));
      } else {
        const data = await housingApi.serviceRegistrations();
        setServiceRequests(data.registrations || []);
        setCatalog(data.catalog || {});
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách yêu cầu.');
    } finally { setLoading(false); }
  }, [tab, housingRequestType]);

  useEffect(() => { loadData(tab); }, [tab, loadData]);

  const decideHousing = async () => {
    if (!decision || busyId) return;
    setBusyId(decision.id); setError(''); setNotice('');
    try {
      await housingApi.decideHousingRequest(decision.id, { status: decision.status, staffNote: note });
      setDecision(null); setNote(''); setNotice('Đã cập nhật yêu cầu lưu trú.'); await loadData('housing');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể xử lý yêu cầu.'); }
    finally { setBusyId(''); }
  };

  const decideService = (id, status) => {
    setServiceDecision({ id, status });
    setNote('');
  };

  const saveServiceDecision = async () => {
    if (!serviceDecision) return;
    setBusyId(serviceDecision.id); setError(''); setNotice('');
    try {
      await housingApi.decideServiceRegistration(serviceDecision.id, { status: serviceDecision.status, staffNote: note });
      setServiceDecision(null); setNote(''); setNotice('Đã cập nhật trạng thái dịch vụ.'); await loadData('services');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể cập nhật dịch vụ.'); }
    finally { setBusyId(''); }
  };

  const visibleHousingRequests = housingRequests.filter((item) => housingStatus === 'ALL' || item.status === housingStatus);

  return <AdminLayout showShell={!embedded}><div className="space-y-5">
    <PageIntro className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-blue-700">CỔNG TỰ PHỤC VỤ</p><PageHeading className={isBoardWorkspace ? 'mt-1 font-semibold text-slate-900' : 'mt-1 text-2xl font-bold text-slate-900'}>{isTransferReview ? 'Duyệt yêu cầu chuyển phòng' : role === 'SERVICE_PROVIDER' ? 'Quản lý đăng ký dịch vụ' : 'Yêu cầu của sinh viên'}</PageHeading><p className="mt-1 text-sm text-slate-500">{isTransferReview ? 'Nhân viên quản lý hồ sơ xác nhận hoặc từ chối đơn chuyển phòng của sinh viên trên toàn KTX.' : isBoardWorkspace ? 'Theo dõi yêu cầu chuyển phòng và trả phòng trên toàn KTX.' : role === 'SERVICE_PROVIDER' ? 'Xem đăng ký theo tòa nhà được phân công và cập nhật tiến độ cung cấp dịch vụ.' : 'Xem và xử lý yêu cầu chuyển phòng, trả phòng và đăng ký dịch vụ.'}</p></div><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><ClipboardList className="h-5 w-5" /></span></PageIntro>
    {!isTransferReview && <div className="flex gap-2 border-b">{canSeeHousing && <button onClick={() => setTab('housing')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === 'housing' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500'}`}>Chuyển / trả phòng</button>}{canSeeServices && <button onClick={() => setTab('services')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === 'services' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500'}`}>Đăng ký dịch vụ</button>}</div>}
    {tab === 'housing' && <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">{housingRequests.filter((item) => item.status === 'PENDING').length} đơn chờ xử lý</p>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">Trạng thái <select value={housingStatus} onChange={(event) => setHousingStatus(event.target.value)} className="ml-2 rounded-lg border bg-white px-3 py-2"><option value="ALL">Tất cả</option>{Object.entries(HOUSING_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" onClick={() => loadData('housing')} disabled={loading || Boolean(busyId)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button>
      </div>
    </div>}
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Đang tải yêu cầu...</div> : tab === 'housing' ? visibleHousingRequests.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">{housingRequests.length ? 'Không có yêu cầu ở trạng thái đã chọn.' : isTransferReview ? 'Chưa có yêu cầu chuyển phòng.' : 'Chưa có yêu cầu lưu trú.'}</div> : <div className="divide-y">{visibleHousingRequests.map((item) => <article key={item.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.requestType === 'TRANSFER' ? `Xin chuyển đến phòng ${item.maPhongMoi}` : 'Xin trả phòng'}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : item.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{HOUSING_STATUS[item.status] || item.status}</span></div><p className="mt-1 text-sm text-slate-600">{item.sinhVien?.hoTen} · {item.sinhVien?.maSV} · Phòng hợp đồng {item.hopDong?.phong?.soPhong || item.hopDong?.maPhong}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>{item.reason && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.reason}</p>}{item.staffNote && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">Ghi chú đã gửi: {item.staffNote}</p>}</div>{role === 'BUILDING_MANAGER' && item.requestType === 'TRANSFER' && item.status === 'PENDING' && <p className="text-xs text-slate-500">Chờ nhân viên quản lý hồ sơ xác nhận.</p>}{canDecideHousingRequest(role, item.requestType) && item.status === 'PENDING' && <div className="flex shrink-0 gap-2"><button disabled={Boolean(busyId)} onClick={() => { setDecision({ id: item.id, status: 'APPROVED', item }); setNote(''); }} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Duyệt</button><button disabled={Boolean(busyId)} onClick={() => { setDecision({ id: item.id, status: 'REJECTED', item }); setNote(''); }} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Từ chối</button></div>}</article>)}</div> : serviceRequests.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Chưa có đăng ký dịch vụ.</div> : <div className="divide-y">{serviceRequests.map((item) => <article key={item.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{catalog[item.serviceCode] || item.serviceName}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SERVICE_STATUS_CLASS[item.status] || 'bg-slate-100 text-slate-600'}`}>{SERVICE_STATUS[item.status] || item.status}</span></div><p className="mt-1 text-sm text-slate-600">{item.sinhVien?.hoTen} · {item.sinhVien?.maSV} · Phòng {item.hopDong?.phong?.soPhong || item.hopDong?.maPhong}</p><p className="mt-1 text-xs text-slate-400">Đăng ký {new Date(item.createdAt).toLocaleString('vi-VN')}{item.updatedAt && item.updatedAt !== item.createdAt ? ` · Cập nhật ${new Date(item.updatedAt).toLocaleString('vi-VN')}` : ''}</p>{item.note && <p className="mt-2 text-sm text-slate-700">Nội dung đăng ký: {item.note}</p>}{item.staffNote && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Phản hồi đơn vị dịch vụ: {item.staffNote}</p>}</div>{canDecideServices && SERVICE_ACTIONS[item.status] && <div className="flex shrink-0 flex-wrap gap-2">{SERVICE_ACTIONS[item.status].map((action) => <button key={action.status} disabled={busyId === item.id} onClick={() => decideService(item.id, action.status)} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${action.status === 'REJECTED' ? 'border border-rose-200 text-rose-700' : action.status === 'COMPLETED' ? 'bg-emerald-700 text-white' : 'bg-blue-700 text-white'}`}>{busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : action.label}</button>)}</div>}</article>)}</div>}
    </section>
    {decision && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target && !busyId) setDecision(null); }}><section role="dialog" aria-modal="true" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-700"><PackageCheck className="h-5 w-5" /></span><div><h2 className="font-bold">{decision.status === 'APPROVED' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}</h2><p className="mt-1 text-sm text-slate-700">{decision.item.sinhVien?.hoTen} · {decision.item.maSinhVien}{decision.item.requestType === 'TRANSFER' ? ` · Chuyển đến ${decision.item.maPhongMoi}` : ' · Trả phòng'}</p><p className="text-xs text-slate-500">{decision.status === 'APPROVED' ? 'Thao tác sẽ cập nhật hợp đồng và sức chứa phòng.' : 'Sinh viên sẽ thấy nội dung phản hồi này.'}</p></div></div><label className="block text-sm font-medium">Ghi chú phản hồi<textarea maxLength={500} rows="3" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="flex justify-end gap-2"><button disabled={Boolean(busyId)} onClick={() => setDecision(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Hủy</button><button disabled={Boolean(busyId)} onClick={decideHousing} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId ? 'Đang lưu...' : 'Xác nhận'}</button></div></section></div>}
    {serviceDecision && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target && !busyId) setServiceDecision(null); }}><section role="dialog" aria-modal="true" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-700"><PackageCheck className="h-5 w-5" /></span><div><h2 className="font-bold">{SERVICE_ACTIONS[serviceRequests.find((item) => item.id === serviceDecision.id)?.status]?.find((action) => action.status === serviceDecision.status)?.label || 'Cập nhật dịch vụ'}</h2><p className="text-xs text-slate-500">Trạng thái mới: {SERVICE_STATUS[serviceDecision.status]}</p></div></div><label className="block text-sm font-medium">Ghi chú phản hồi<textarea maxLength={500} rows="3" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Thông tin triển khai hoặc nội dung cần sinh viên biết" /></label><div className="flex justify-end gap-2"><button disabled={Boolean(busyId)} onClick={() => setServiceDecision(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Hủy</button><button disabled={Boolean(busyId)} onClick={saveServiceDecision} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId ? 'Đang lưu...' : 'Cập nhật trạng thái'}</button></div></section></div>}
  </div></AdminLayout>;
};

export default SelfServiceManagement;
