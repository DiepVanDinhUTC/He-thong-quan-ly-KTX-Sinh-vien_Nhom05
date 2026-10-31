/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight, CheckCircle2, DoorOpen, RefreshCw,
  Home, Shield, XCircle
} from 'lucide-react';
import AdminLogoutButton from '../components/AdminLogoutButton';
import AdminUserProfile from '../components/AdminUserProfile';
import DashboardNavLink from '../components/DashboardNavLink';
import StaffHomeContent from '../components/StaffHomeContent';
import { archivistSections } from '../utils/staffNavigation';
import StudentManagement from './StudentManagement';
import ContractManagement from './ContractManagement';
import SelfServiceManagement from './SelfServiceManagement';
import { housingApi } from '../services/housingApi';
import { securityMedicalApi } from '../services/securityMedicalApi';
import { currentHousingDate, housingPeriodEnd, defaultHousingAmount } from '../utils/housingBilling';

const tabs = [
  { id: 'home', label: 'Trang chủ', Icon: Home },
  ...archivistSections,
];

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const localDate = currentHousingDate;

const controlClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'block text-sm font-medium text-slate-700';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const Notice = ({ error, notice }) => <>
  {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
  {notice && <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}
</>;

const RoomAssignments = () => {
  const [rooms, setRooms] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [assignment, setAssignment] = useState({ maSinhVien: '', maPhong: '', ngayBatDau: localDate(), ngayKetThuc: housingPeriodEnd(), tongTien: '' });
  const [moveRoomId, setMoveRoomId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [roomResponse, candidateResponse] = await Promise.all([
        housingApi.archiveRoomMap(), housingApi.archiveRoomCandidates()
      ]);
      setRooms(roomResponse.data || []);
      setCandidates(candidateResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách phòng và sinh viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allMembers = useMemo(() => rooms.flatMap((room) => (room.thanhVien || []).filter((member) => member.source !== 'MILITARY' && member.maHopDong).map((member) => ({ member, room }))), [rooms]);
  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allMembers;
    return allMembers.filter(({ member, room }) => `${member.maSinhVien} ${member.hoTen} ${member.lop || ''} ${room.soPhong} ${room.tenToaNha || ''}`.toLowerCase().includes(query));
  }, [allMembers, search]);
  const availableRooms = useMemo(() => rooms.filter((room) => Number(room.soSinhVienHienTai) < Number(room.soSinhVienToiDa)), [rooms]);

  const openAssign = () => {
    const initialRoom = availableRooms[0];
    setDialog({ type: 'assign' });
    setAssignment({
      maSinhVien: candidates[0]?.maSV || '',
      maPhong: initialRoom?.maPhong || '',
      ngayBatDau: localDate(),
      ngayKetThuc: housingPeriodEnd(),
      tongTien: String(defaultHousingAmount(initialRoom)),
    });
    setError('');
  };

  const openMove = (room, member) => {
    const candidate = rooms.find((item) => item.maPhong !== room.maPhong
      && item.loaiPhong === room.loaiPhong
      && Number(item.soSinhVienHienTai) < Number(item.soSinhVienToiDa));
    setDialog({ type: 'move', room, member });
    setMoveRoomId(candidate?.maPhong || '');
    setError('');
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await housingApi.assignArchiveRoom({ ...assignment, tongTien: Number(assignment.tongTien) });
      setNotice(response.message || 'Đã xếp phòng và tạo hợp đồng chờ thanh toán.');
      setDialog(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xếp phòng cho sinh viên.');
    } finally {
      setSaving(false);
    }
  };

  const submitMove = async (event) => {
    event.preventDefault();
    if (!dialog?.member || !moveRoomId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await housingApi.moveArchiveMember(dialog.room.maPhong, dialog.member.maHopDong, moveRoomId);
      setNotice(response.message || `Đã chuyển ${dialog.member.hoTen} sang phòng mới.`);
      setDialog(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể chuyển phòng cho sinh viên.');
    } finally {
      setSaving(false);
    }
  };

  const onAssignmentRoomChange = (maPhong) => {
    const room = rooms.find((item) => item.maPhong === maPhong);
    setAssignment((current) => ({
      ...current,
      maPhong,
      tongTien: String(defaultHousingAmount(room)),
    }));
  };

  const roomLabel = (room) => `${room.soPhong} · ${room.tenToaNha || room.maToaNha || 'Chưa gán tòa'} · ${room.soSinhVienHienTai}/${room.soSinhVienToiDa}`;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold text-slate-900">Xếp phòng và chuyển phòng</h2><p className="mt-1 text-sm text-slate-500">Xếp sinh viên chưa có hợp đồng, theo dõi phòng hiện tại và chuyển sang phòng cùng loại còn chỗ.</p></div>
      <div className="flex gap-2"><button type="button" onClick={load} disabled={loading} className={secondaryButton}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button><button type="button" onClick={openAssign} disabled={loading || !candidates.length || !availableRooms.length} className={primaryButton}><DoorOpen className="h-4 w-4" />Xếp phòng</button></div>
    </div>
    <Notice error={error} notice={notice} />
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Phòng trong hệ thống</p><p className="mt-1 text-2xl font-bold">{rooms.length}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Sinh viên đang có phòng</p><p className="mt-1 text-2xl font-bold">{allMembers.length}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Chưa có hợp đồng lưu trú</p><p className="mt-1 text-2xl font-bold">{candidates.length}</p></div>
    </div>
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h3 className="font-semibold text-slate-900">Danh sách sinh viên đang ở</h3><p className="mt-1 text-xs text-slate-500">Chuyển phòng sẽ giữ nguyên hợp đồng và lịch sử lưu trú.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sinh viên, mã SV, phòng..." className="w-full rounded-lg border px-3 py-2 text-sm sm:w-72" /></div>
      {loading ? <p className="p-8 text-center text-sm text-slate-500">Đang tải danh sách phòng…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Sinh viên</th><th className="px-4 py-3">Phòng hiện tại</th><th className="px-4 py-3">Hợp đồng</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y">
        {filteredMembers.map(({ member, room }) => <tr key={member.maHopDong}><td className="px-4 py-3"><p className="font-semibold">{member.hoTen}</p><p className="text-xs text-slate-500">{member.maSinhVien}{member.lop ? ` · ${member.lop}` : ''}</p></td><td className="px-4 py-3">{room.soPhong} · {room.tenToaNha || room.maToaNha}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${member.trangThaiHopDong === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{member.trangThaiHopDong === 'ACTIVE' ? 'Đang hiệu lực' : 'Chờ thanh toán'}</span></td><td className="px-4 py-3 text-right"><button type="button" disabled={saving} onClick={() => openMove(room, member)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><ArrowLeftRight className="h-3.5 w-3.5" />Chuyển phòng</button></td></tr>)}
        {!filteredMembers.length && <tr><td colSpan="4" className="px-4 py-10 text-center text-slate-500">{allMembers.length ? 'Không có kết quả phù hợp.' : 'Chưa có sinh viên được xếp phòng.'}</td></tr>}
      </tbody></table></div>}
    </section>

    {dialog?.type === 'assign' && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialog(null); }}><form onSubmit={submitAssignment} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between"><div><h3 className="text-lg font-bold text-slate-900">Xếp phòng cho sinh viên</h3><p className="mt-1 text-sm text-slate-500">Tạo hợp đồng lưu trú ở trạng thái chờ thanh toán.</p></div><button type="button" onClick={() => setDialog(null)} className="rounded px-2 text-xl text-slate-500" aria-label="Đóng">×</button></div>
      <label className={labelClass}>Sinh viên chưa có hợp đồng<select required value={assignment.maSinhVien} onChange={(event) => setAssignment({ ...assignment, maSinhVien: event.target.value })} className={controlClass}><option value="">Chọn sinh viên</option>{candidates.map((student) => <option key={student.maSV} value={student.maSV}>{student.hoTen} · {student.maSV}{student.lop ? ` · ${student.lop}` : ''}</option>)}</select></label>
      <label className={labelClass}>Phòng còn chỗ<select required value={assignment.maPhong} onChange={(event) => onAssignmentRoomChange(event.target.value)} className={controlClass}><option value="">Chọn phòng</option>{availableRooms.map((room) => <option key={room.maPhong} value={room.maPhong}>{roomLabel(room)}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Ngày bắt đầu<input required type="date" value={assignment.ngayBatDau} onChange={(event) => setAssignment({ ...assignment, ngayBatDau: event.target.value, ngayKetThuc: event.target.value ? housingPeriodEnd(event.target.value) : '' })} className={controlClass} /></label><label className={labelClass}>Ngày kết thúc<input required type="date" value={assignment.ngayKetThuc} onChange={(event) => setAssignment({ ...assignment, ngayKetThuc: event.target.value })} className={controlClass} /></label></div>
      <label className={labelClass}>Tổng tiền hợp đồng<input required type="number" min="1" value={assignment.tongTien} onChange={(event) => setAssignment({ ...assignment, tongTien: event.target.value })} className={controlClass} /></label>
      <p className="text-sm text-blue-800">Phí nội trú thu theo học kỳ, 5 tháng/lần. Tổng tiền mặc định bằng phí tháng × 5.</p>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" disabled={saving} onClick={() => setDialog(null)} className={secondaryButton}>Hủy</button><button disabled={saving || !candidates.length || !availableRooms.length} className={primaryButton}>{saving ? 'Đang xếp phòng…' : 'Xác nhận xếp phòng'}</button></div>
    </form></div>}

    {dialog?.type === 'move' && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialog(null); }}><form onSubmit={submitMove} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
      <div><h3 className="text-lg font-bold text-slate-900">Chuyển phòng</h3><p className="mt-1 text-sm text-slate-500">{dialog.member.hoTen} · phòng {dialog.room.soPhong}</p></div>
      <label className={labelClass}>Phòng cùng loại còn chỗ<select required value={moveRoomId} onChange={(event) => setMoveRoomId(event.target.value)} className={controlClass}><option value="">Chọn phòng</option>{rooms.filter((room) => room.maPhong !== dialog.room.maPhong && room.loaiPhong === dialog.room.loaiPhong && Number(room.soSinhVienHienTai) < Number(room.soSinhVienToiDa)).map((room) => <option key={room.maPhong} value={room.maPhong}>{roomLabel(room)}</option>)}</select></label>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" disabled={saving} onClick={() => setDialog(null)} className={secondaryButton}>Hủy</button><button disabled={saving || !moveRoomId} className={primaryButton}>{saving ? 'Đang chuyển…' : 'Xác nhận chuyển'}</button></div>
    </form></div>}
  </div>;
};

const DisciplineManagement = () => {
  const [violations, setViolations] = useState([]);
  const [summary, setSummary] = useState([]);
  const [threshold, setThreshold] = useState(3);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [records, totals] = await Promise.all([securityMedicalApi.violations(), securityMedicalApi.violationSummary()]);
      setViolations(records || []);
      setSummary(totals.data || []);
      setThreshold(totals.threshold);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải hồ sơ vi phạm của sinh viên.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const normalized = (value) => (value || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const matches = (name, id) => normalized(`${name || ''} ${id || ''}`).includes(normalized(search.trim()));
  const filteredSummary = summary.filter((item) => matches(item.hoTen, item.maSinhVien));
  const filteredViolations = violations.filter((item) => matches(item.sinhVien?.hoTen, item.maSinhVien));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Thông tin và kỷ luật sinh viên</h2><p className="mt-1 text-sm text-slate-500">Theo dõi biên bản do nhân viên trật tự trị an ghi nhận. Từ {threshold} lần vi phạm, sinh viên không đủ điều kiện đăng ký tiếp hợp đồng nội trú.</p></div><button type="button" onClick={load} disabled={loading} className={secondaryButton}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button></div>
    <Notice error={error} />
    <label className={labelClass}>Tìm sinh viên<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc mã sinh viên" className={`${controlClass} max-w-md`} /></label>
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b p-5"><h3 className="font-semibold">Tổng số vi phạm theo sinh viên</h3><p className="mt-1 text-xs text-slate-500">Tính tất cả biên bản đã ghi nhận, không giới hạn 200 biên bản gần đây.</p></div>
      {loading ? <p className="p-5 text-sm text-slate-500">Đang tải…</p> : filteredSummary.length ? <div className="divide-y">{filteredSummary.map((item) => <div key={item.maSinhVien} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><p className="font-semibold">{item.hoTen || 'Sinh viên'} · {item.maSinhVien}</p><p className="text-sm text-slate-500">{item.count} lần vi phạm</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.count >= threshold ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'}`}>{item.count >= threshold ? 'Không đủ điều kiện đăng ký tiếp' : 'Chưa đạt ngưỡng'}</span></div>)}</div> : <p className="p-5 text-sm text-slate-500">Không có sinh viên phù hợp.</p>}
    </section>
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b p-5"><h3 className="font-semibold">Biên bản vi phạm gần đây</h3><p className="mt-1 text-xs text-slate-500">Tối đa 200 biên bản mới nhất trong toàn KTX</p></div>
      {filteredViolations.length ? <div className="divide-y">{filteredViolations.map((record) => <article key={record.id} className="p-4"><p className="font-semibold">{record.sinhVien?.hoTen || 'Sinh viên'} · {record.maSinhVien}</p><p className="mt-1 text-xs text-slate-500">{record.toaNha?.tenToaNha || 'KTX'} · phòng {record.phong?.soPhong || '—'} · {formatDate(record.occurredAt)} · {record.recordedBy?.nhanVien?.hoTen || record.recordedBy?.username || '—'}</p><p className="mt-2 whitespace-pre-wrap text-sm">{record.description}</p>{record.actionTaken && <p className="mt-2 whitespace-pre-wrap text-sm text-blue-800">Biện pháp: {record.actionTaken}</p>}</article>)}</div> : <p className="p-5 text-sm text-slate-500">Không có biên bản phù hợp.</p>}
    </section>
  </div>;
};

const ArchivistWorkspace = () => {
  const contentScrollRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const active = tabs.find((tab) => tab.id === searchParams.get('section')) || tabs[0];
  const activeTab = active.id;
  const setActiveTab = (section) => setSearchParams(section === 'home' ? {} : { section });
  const [panelKey, setPanelKey] = useState(0);
  const refreshPanel = () => setPanelKey((key) => key + 1);
  useEffect(() => { contentScrollRef.current?.scrollTo({ top: 0 }); }, [activeTab]);

  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800">
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-blue-950 text-white">
      <NavLink to="/archive-management" className="flex items-center gap-3 border-b border-blue-900 px-6 py-5"><Shield className="h-8 w-8 text-blue-200" /><span className="text-lg font-bold tracking-wide">KTX · HỒ SƠ</span></NavLink>
      <nav aria-label="Nghiệp vụ hồ sơ lưu trữ" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <DashboardNavLink />
        {tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${activeTab === id ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}><Icon className="h-5 w-5" />{label}</button>)}
      </nav>
      <div className="border-t border-blue-900 p-4"><AdminUserProfile /></div><AdminLogoutButton />
    </aside>
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Cán bộ quản lý hồ sơ</p><h1 className="mt-1 text-xl font-bold text-slate-900">{active.label}</h1></div>{activeTab !== 'home' && <button type="button" onClick={refreshPanel} className={secondaryButton}><RefreshCw className="h-4 w-4" />Tải lại mục này</button>}</header>
      <main ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
        {activeTab === 'home' && <StaffHomeContent role="ARCHIVIST" />}
        {activeTab === 'students' && <StudentManagement key={panelKey} embedded />}
        {activeTab === 'applications' && <ContractManagement key={panelKey} embedded />}
        {activeTab === 'rooms' && <RoomAssignments key={panelKey} />}
        {activeTab === 'transfers' && <SelfServiceManagement key={panelKey} embedded housingRequestType="TRANSFER" />}
        {activeTab === 'discipline' && <DisciplineManagement key={panelKey} />}
      </main>
    </div>
  </div>;
};

class ArchivistErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Lỗi khi hiển thị trang hồ sơ lưu trữ:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans text-slate-800">
      <section role="alert" className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-red-800">Không thể hiển thị trang hồ sơ lưu trữ</h1>
        <p className="mt-2 text-sm text-slate-600">Trang gặp lỗi khi tải giao diện. Hãy tải lại trang; nếu lỗi lặp lại, gửi thông báo lỗi này cho quản trị hệ thống.</p>
        <pre className="mt-4 overflow-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700">{this.state.error.message}</pre>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Tải lại trang</button>
      </section>
    </main>;
  }
}

const ArchivistManagement = () => <ArchivistErrorBoundary><ArchivistWorkspace /></ArchivistErrorBoundary>;

export default ArchivistManagement;
