/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, CheckCircle2, DoorOpen, Home, Package, RefreshCw,
  Shield, Users, XCircle
} from 'lucide-react';
import AdminLogoutButton from '../components/AdminLogoutButton';
import AdminUserProfile from '../components/AdminUserProfile';
import DashboardNavLink from '../components/DashboardNavLink';
import StaffHomeContent from '../components/StaffHomeContent';
import { militarySections } from '../utils/staffNavigation';
import { militaryManagementApi as api } from '../services/militaryManagementApi';

const tabs = [
  { id: 'home', label: 'Trang chủ', Icon: Home },
  ...militarySections,
];
const emptyOverview = { studentCount: 0, assignedCount: 0, equipmentCount: 0, meetingRoomCount: 0, upcomingBookingCount: 0 };
const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';
const moneyDate = (value) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const Panel = ({ title, description, children }) => <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
    <div><h2 className="font-semibold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
  </div>
  <div className="p-5">{children}</div>
</section>;

const statColors = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700' };
const Stat = ({ label, value, Icon, color = 'blue' }) => <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statColors[color]}`}><Icon className="h-6 w-6" /></div>
  <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
</div>;

const MilitaryManagement = () => {
  const contentScrollRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabs.find(({ id }) => id === searchParams.get('section'))?.id || 'home';
  const isHome = activeTab === 'home';
  const setActiveTab = (section) => setSearchParams(section === 'home' ? {} : { section });
  const [overview, setOverview] = useState(emptyOverview);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [equipment, setEquipment] = useState({ items: [], issues: [] });
  const [meetingRooms, setMeetingRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncResult, setSyncResult] = useState(null);
  const [equipmentForm, setEquipmentForm] = useState({ code: '', name: '', category: '', size: '', unit: 'bộ', quantityInStock: '0', note: '' });
  const [editingEquipmentId, setEditingEquipmentId] = useState('');
  const [issueForms, setIssueForms] = useState({});
  const [meetingRoomForm, setMeetingRoomForm] = useState({ code: '', name: '', location: '', capacity: '10' });
  const [editingMeetingRoomId, setEditingMeetingRoomId] = useState('');
  const [bookingForm, setBookingForm] = useState({ meetingRoomId: '', title: '', purpose: '', startsAt: '', endsAt: '' });
  const [studyPeriod, setStudyPeriod] = useState({ startsAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10), batchCode: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      api.overview(), api.students(), api.rooms(), api.equipment(), api.meetingRooms(),
    ]);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) setError(failed.reason?.response?.data?.message || 'Không thể tải đầy đủ dữ liệu quân sự.');
    if (results[0].status === 'fulfilled') setOverview(results[0].value.data.data || emptyOverview);
    if (results[1].status === 'fulfilled') setStudents(results[1].value.data.data || []);
    if (results[2].status === 'fulfilled') setRooms(results[2].value.data.data || []);
    if (results[3].status === 'fulfilled') setEquipment(results[3].value.data.data || { items: [], issues: [] });
    if (results[4].status === 'fulfilled') setMeetingRooms(results[4].value.data.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (!isHome) loadData(); }, [loadData, isHome]);
  useEffect(() => { contentScrollRef.current?.scrollTo({ top: 0 }); }, [activeTab]);

  const activeRooms = useMemo(() => meetingRooms.filter((room) => room.isActive), [meetingRooms]);
  const militaryRooms = useMemo(() => rooms.filter((room) => room.isMilitaryTarget), [rooms]);
  const act = async (operation, successMessage, reload = true) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await operation();
      setNotice(response.data.message || successMessage);
      if (reload) await loadData();
      return response;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Thao tác chưa hoàn tất. Vui lòng thử lại.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setError('');
    setNotice('');
    setSyncError('');
    setSyncResult(null);
    try {
      const response = await api.syncStudents();
      const payload = response.data;
      const result = payload?.data;
      if (!payload?.success || !result || !Array.isArray(result.skipped)) {
        throw new Error(payload?.message || 'SIS không trả về kết quả đồng bộ hợp lệ.');
      }

      let message = `SIS trả ${result.received ?? 0} đăng ký; ${result.selected ?? 0} hồ sơ phù hợp; tạo ${result.createdAccounts ?? 0} tài khoản, gắn diện quân sự ${result.militaryStudentsMarked ?? 0} hồ sơ, liên kết ${result.linkedProfiles ?? 0}.`;
      if (result.linkedProfiles || result.militaryStudentsMarked) message += ' Mở Xếp phòng quân sự và chọn ngày bắt đầu thực tế để bố trí phòng trong 14 ngày.';
      if (result.roomAssignment) message += ` Tự xếp phòng A1: ${result.roomAssignment.assigned ?? 0} học viên mới; ${result.roomAssignment.alreadyAssigned ?? 0} học viên đã có phòng hợp lệ.`;
      if (result.roomAssignment?.unassignedCount) message += ` Còn ${result.roomAssignment.unassignedCount} học viên chưa có phòng do không đủ chỗ trong các phòng A1 dành cho quân sự.`;
      if (result.roomAssignmentError) message += ` Chưa xếp được phòng tự động: ${result.roomAssignmentError}`;
      if (Number(result.selected) === 0) {
        message += ' SIS đã kết nối nhưng không có đăng ký nào khớp bộ lọc học phần, đợt học và khoa.';
      } else if (result.skipped.length) {
        message += ` Có ${result.skipped.length} hồ sơ bị bỏ qua; xem lý do bên dưới.`;
      }
      setSyncResult({
        ...result,
        message,
        kind: Number(result.selected) === 0 || Boolean(result.roomAssignmentError) || Number(result.roomAssignment?.unassignedCount) > 0 ? 'warning' : 'success',
      });
      await loadData();
    } catch (requestError) {
      const responseMessage = requestError.response?.data?.message;
      const message = responseMessage
        || (requestError.request
          ? 'Không nhận được phản hồi khi gọi SIS. Hãy kiểm tra URL SIS, trạng thái máy chủ và kết nối mạng.'
          : requestError.message)
        || 'Không thể đồng bộ danh sách SIS.';
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  };

  const runAutoAssignment = async () => {
    await act(() => api.autoAssignRooms(studyPeriod), 'Đã xếp phòng GDQP trong 14 ngày, giữ nguyên hợp đồng nội trú gốc.');
  };

  const submitEquipment = async (event) => {
    event.preventDefault();
    const payload = { ...equipmentForm, quantityInStock: Number(equipmentForm.quantityInStock) };
    const response = editingEquipmentId
      ? await act(() => api.updateEquipment(editingEquipmentId, payload), 'Đã cập nhật mặt hàng.')
      : await act(() => api.createEquipment(payload), 'Đã thêm mặt hàng.');
    if (response) {
      setEditingEquipmentId('');
      setEquipmentForm({ code: '', name: '', category: '', size: '', unit: 'bộ', quantityInStock: '0', note: '' });
    }
  };

  const submitIssue = async (item) => {
    const form = issueForms[item.id] || {};
    const maSinhVien = form.maSinhVien || '';
    const quantity = Number(form.quantity || 1);
    if (!maSinhVien) return setError('Chọn học viên cần nhận quân tư trang.');
    const response = await act(() => api.issueEquipment(item.id, { maSinhVien, quantity }), 'Đã ghi nhận cấp phát.');
    if (response) setIssueForms((current) => ({ ...current, [item.id]: { ...current[item.id], quantity: '1' } }));
  };

  const returnIssue = async (issue) => {
    const remaining = issue.quantity - issue.returnedQuantity;
    const input = window.prompt(`Số lượng hoàn trả (còn ${remaining} ${issue.item.unit}):`, String(remaining));
    if (input === null) return;
    const quantity = Number(input);
    if (!Number.isInteger(quantity) || quantity < 1) return setError('Nhập số lượng hoàn trả là số nguyên dương.');
    await act(() => api.returnEquipment(issue.id, { quantity }), 'Đã ghi nhận hoàn trả.');
  };

  const submitMeetingRoom = async (event) => {
    event.preventDefault();
    const payload = { ...meetingRoomForm, capacity: Number(meetingRoomForm.capacity) };
    const response = editingMeetingRoomId
      ? await act(() => api.updateMeetingRoom(editingMeetingRoomId, payload), 'Đã cập nhật phòng giao ban.')
      : await act(() => api.createMeetingRoom(payload), 'Đã thêm phòng giao ban.');
    if (response) {
      setEditingMeetingRoomId('');
      setMeetingRoomForm({ code: '', name: '', location: '', capacity: '10' });
    }
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    const response = await act(() => api.createMeetingBooking({
      ...bookingForm,
      startsAt: new Date(bookingForm.startsAt).toISOString(),
      endsAt: new Date(bookingForm.endsAt).toISOString(),
    }), 'Đã đặt lịch phòng giao ban.');
    if (response) setBookingForm((current) => ({ ...current, title: '', purpose: '', startsAt: '', endsAt: '' }));
  };

  const tableWrap = 'overflow-x-auto';
  const tableClass = 'w-full min-w-[720px] text-left text-sm';
  const thClass = 'bg-slate-50 px-4 py-3 font-semibold text-slate-600';
  const tdClass = 'border-t border-slate-100 px-4 py-3 align-middle text-slate-700';

  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans text-slate-800">
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-blue-950 text-white">
      <NavLink to="/military-management" className="flex items-center gap-3 border-b border-blue-900 px-6 py-5">
        <Shield className="h-8 w-8 text-blue-200" /><span className="text-lg font-bold tracking-wide">KTX · QUÂN SỰ</span>
      </NavLink>
      <nav aria-label="Nghiệp vụ quân sự" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <DashboardNavLink />
        {tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${activeTab === id ? 'bg-blue-800 font-semibold text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
          <Icon className="h-5 w-5" />{label}
        </button>)}
      </nav>
      <div className="border-t border-blue-900 p-4"><AdminUserProfile /></div>
      <AdminLogoutButton />
    </aside>

    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-8">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Cán bộ quản lý Quân sự</p><h1 className="mt-1 text-xl font-bold text-slate-900">{isHome ? 'Trang chủ' : 'Quản lý học viên và cơ sở quân sự'}</h1></div>
        {!isHome && <button type="button" onClick={loadData} disabled={loading} className={secondaryButtonClass}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button>}
      </header>

      <main ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-5 p-5 sm:p-8">
        {isHome ? <StaffHomeContent role="MILITARY_OFFICER" /> : <>
        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Học viên quân sự" value={overview.studentCount} Icon={Users} />
          <Stat label="Đã được xếp phòng" value={overview.assignedCount} Icon={DoorOpen} color="emerald" />
          <Stat label="Mặt hàng quân tư trang" value={overview.equipmentCount} Icon={Package} color="amber" />
          <Stat label="Phòng giao ban · lịch sắp tới" value={`${overview.meetingRoomCount} · ${overview.upcomingBookingCount}`} Icon={CalendarDays} color="violet" />
        </div>

        {activeTab === 'students' && <Panel title="Tiếp nhận danh sách học viên từ SIS" description="Dùng chung API nguồn với đồng bộ sinh viên chính quy. SIS mock có 50 hồ sơ với 50 đăng ký GDQP hợp lệ thuộc hai đợt và năm khoa; khi có SIS thật, thay URL cùng mã lọc trong cấu hình.">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-blue-50 p-4">
            <div className="max-w-3xl text-sm text-blue-900">Hồ sơ đủ điều kiện được đánh dấu là học viên quân sự. Nếu đã có tài khoản sinh viên, hệ thống giữ nguyên vai trò và mật khẩu; chỉ tạo tài khoản mới khi chưa có.</div>
            <button type="button" onClick={runSync} disabled={syncing || loading} className={buttonClass}><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Đang lấy dữ liệu SIS…' : 'Đồng bộ SIS ngay'}</button>
          </div>
          {syncError && <div role="alert" aria-live="assertive" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Đồng bộ SIS thất bại</p><p className="mt-1">{syncError}</p></div></div>}
          {syncResult && <div role={syncResult.kind === 'warning' ? 'alert' : 'status'} aria-live="polite" className={`mb-4 rounded-lg border px-4 py-3 text-sm ${syncResult.kind === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            <p className="font-medium">{syncResult.message}</p>
            {syncResult.skipped.length > 0 && <details className="mt-2">
              <summary className="cursor-pointer font-semibold">Xem {syncResult.skipped.length} đăng ký bị bỏ qua</summary>
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pl-5">
                {syncResult.skipped.map((item, index) => <li key={`${item.maSV || 'unknown'}-${index}`} className="list-disc">
                  <span className="font-medium">{item.maSV || 'Không rõ mã học viên'}:</span> {item.reason || 'Không rõ nguyên nhân.'}
                </li>)}
              </ul>
            </details>}
          </div>}
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Đang tải danh sách học viên…</p> : <div className={tableWrap}><table className={tableClass}>
            <thead><tr>{['Mã học viên', 'Họ và tên', 'Giới tính', 'Lớp', 'Khoa', 'Tài khoản / phòng hiện tại'].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
            <tbody>{students.map((student) => <tr key={student.maSV}>
              <td className={`${tdClass} font-semibold`}>{student.maSV}</td><td className={tdClass}>{student.hoTen}</td><td className={tdClass}>{student.gioiTinh ? 'Nam' : 'Nữ'}</td><td className={tdClass}>{student.lop}</td><td className={tdClass}>{student.khoa}</td>
              <td className={tdClass}>{student.militaryRoomAssignments?.[0]?.phong ? `${student.militaryRoomAssignments[0].phong.soPhong} · ${student.militaryRoomAssignments[0].phong.toaNha?.tenToaNha || ''}` : 'Đã có tài khoản · chưa xếp phòng'}</td>
            </tr>)}{!students.length && <tr><td className={`${tdClass} py-8 text-center text-slate-500`} colSpan="6">Chưa có học viên quân sự. Dùng bộ tài khoản demo hoặc chạy đồng bộ SIS để tiếp nhận danh sách.</td></tr>}</tbody>
          </table></div>}
        </Panel>}

        {activeTab === 'rooms' && <div className="space-y-5">
          <Panel title="Xếp phòng GDQP trong 2 tuần" description="Phòng quân sự A1: 103–107, 201–209, 301–309, 401–409. Bố trí trong 14 ngày, học viên nam và nữ ở phòng riêng.">
            <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Ngày bắt đầu đợt học<input required type="date" value={studyPeriod.startsAt} onChange={(event) => setStudyPeriod({ ...studyPeriod, startsAt: event.target.value })} className={`${fieldClass} mt-1`} /></label><label className="text-sm font-medium text-slate-700">Mã đợt GDQP (nếu có)<input maxLength={50} value={studyPeriod.batchCode} onChange={(event) => setStudyPeriod({ ...studyPeriod, batchCode: event.target.value })} className={`${fieldClass} mt-1`} placeholder="VD: GDQP-2026-01" /></label></div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-blue-50 p-4">
              <p className="max-w-3xl text-sm leading-6 text-blue-950">Hết 14 ngày, hệ thống kết thúc chỗ ở quân sự và hiển thị lại phòng nội trú gốc nếu hợp đồng còn hiệu lực. Chạy lại không kéo dài đợt đang có. Muốn bố trí đợt tiếp theo, chọn ngày bắt đầu sau khi đợt trước kết thúc.</p>
              <button type="button" className={buttonClass} disabled={saving || loading || !students.length || !studyPeriod.startsAt} onClick={runAutoAssignment}><DoorOpen className="h-4 w-4" />{saving ? 'Đang xếp phòng…' : 'Xếp phòng đợt 14 ngày'}</button>
            </div>
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Phòng dành cho quân sự · {militaryRooms.length} phòng</h3>
              {loading ? <p className="text-sm text-slate-500">Đang tải dữ liệu phòng…</p> : militaryRooms.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {militaryRooms.map((room) => <div key={room.maPhong} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-semibold text-slate-900">Tầng {room.tang} · {room.soPhong}</p>
                  <p className="mt-1 text-xs text-slate-500">{room.soSinhVienHienTai}/{room.soSinhVienToiDa} chỗ sử dụng</p>
                </div>)}
              </div> : <p className="text-sm text-amber-700">Chưa có danh sách phòng A1. Hãy chạy seed địa điểm và phòng trước.</p>}
            </div>
          </Panel>
          <Panel title="Danh sách phân phòng học viên" description="Phòng quân sự chỉ ghép học viên cùng giới tính.">
            {loading ? <p className="py-8 text-center text-sm text-slate-500">Đang tải danh sách phân phòng…</p> : <div className={tableWrap}><table className={tableClass}>
              <thead><tr>{['Mã học viên', 'Học viên', 'Giới tính', 'Lớp', 'Tòa / tầng / phòng', 'Trạng thái'].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
              <tbody>{students.map((student) => {
                const assignment = student.militaryRoomAssignments?.[0];
                const room = assignment?.phong;
                return <tr key={student.maSV}>
                  <td className={`${tdClass} font-semibold`}>{student.maSV}</td>
                  <td className={tdClass}>{student.hoTen}</td>
                  <td className={tdClass}>{student.gioiTinh ? 'Nam' : 'Nữ'}</td>
                  <td className={tdClass}>{student.lop}</td>
                  <td className={tdClass}>{room ? <><p>{room.toaNha?.tenToaNha || room.maToaNha} · tầng {room.tang ?? '—'} · {room.soPhong}</p><p className="mt-1 text-xs text-slate-500">{moneyDate(assignment.startsAt)} – {moneyDate(assignment.endsAt)}</p>{assignment.batchCode && <p className="mt-1 text-xs text-slate-500">{assignment.batchCode}</p>}</> : '—'}</td>
                  <td className={tdClass}>{room ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Đã xếp</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Chưa xếp</span>}</td>
                </tr>;
              })}{!students.length && <tr><td className={`${tdClass} py-8 text-center text-slate-500`} colSpan="6">Chưa có học viên. Hãy tạo bộ tài khoản demo hoặc đồng bộ SIS trước.</td></tr>}</tbody>
            </table></div>}
          </Panel>
        </div>}

        {activeTab === 'equipment' && <div className="space-y-5">
          <Panel title={editingEquipmentId ? 'Cập nhật quân tư trang' : 'Thêm quân tư trang vào kho'} description="Theo dõi tồn kho và lịch sử cấp phát, hoàn trả cho từng học viên.">
            <form onSubmit={submitEquipment} className="grid gap-3 md:grid-cols-4">
              <input className={fieldClass} required placeholder="Mã mặt hàng" value={equipmentForm.code} onChange={(event) => setEquipmentForm({ ...equipmentForm, code: event.target.value })} />
              <input className={fieldClass} required placeholder="Tên quân tư trang" value={equipmentForm.name} onChange={(event) => setEquipmentForm({ ...equipmentForm, name: event.target.value })} />
              <input className={fieldClass} required placeholder="Loại (quân phục, giày…)" value={equipmentForm.category} onChange={(event) => setEquipmentForm({ ...equipmentForm, category: event.target.value })} />
              <input className={fieldClass} placeholder="Cỡ / kích thước" value={equipmentForm.size} onChange={(event) => setEquipmentForm({ ...equipmentForm, size: event.target.value })} />
              <input className={fieldClass} required type="number" min="0" placeholder="Tồn kho" value={equipmentForm.quantityInStock} onChange={(event) => setEquipmentForm({ ...equipmentForm, quantityInStock: event.target.value })} />
              <input className={fieldClass} required placeholder="Đơn vị (bộ, đôi…)" value={equipmentForm.unit} onChange={(event) => setEquipmentForm({ ...equipmentForm, unit: event.target.value })} />
              <input className={fieldClass} placeholder="Ghi chú" value={equipmentForm.note} onChange={(event) => setEquipmentForm({ ...equipmentForm, note: event.target.value })} />
              <div className="flex gap-2"><button className={buttonClass} disabled={saving}>{editingEquipmentId ? 'Lưu thay đổi' : 'Thêm vào kho'}</button>{editingEquipmentId && <button type="button" className={secondaryButtonClass} onClick={() => { setEditingEquipmentId(''); setEquipmentForm({ code: '', name: '', category: '', size: '', unit: 'bộ', quantityInStock: '0', note: '' }); }}>Hủy</button>}</div>
            </form>
          </Panel>
          <Panel title="Tồn kho và cấp phát" description="Cấp phát làm giảm tồn kho; hoàn trả một phần hoặc toàn bộ sẽ cộng lại tồn kho.">
            <div className={tableWrap}><table className={tableClass}>
              <thead><tr>{['Mặt hàng', 'Loại / cỡ', 'Tồn kho', 'Cấp cho học viên', ''].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
              <tbody>{equipment.items.map((item) => {
                const form = issueForms[item.id] || { maSinhVien: '', quantity: '1' };
                return <tr key={item.id}>
                  <td className={tdClass}><p className="font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.code} · {item.unit}</p></td>
                  <td className={tdClass}>{item.category}{item.size ? ` · cỡ ${item.size}` : ''}</td>
                  <td className={`${tdClass} font-semibold`}>{item.quantityInStock}</td>
                  <td className={tdClass}><div className="flex min-w-[390px] gap-2">
                    <select className={fieldClass} value={form.maSinhVien} onChange={(event) => setIssueForms((current) => ({ ...current, [item.id]: { ...form, maSinhVien: event.target.value } }))}>
                      <option value="">Chọn học viên</option>{students.map((student) => <option key={student.maSV} value={student.maSV}>{student.maSV} · {student.hoTen}</option>)}
                    </select>
                    <input aria-label="Số lượng cấp" className={`${fieldClass} w-24`} type="number" min="1" max={item.quantityInStock} value={form.quantity} onChange={(event) => setIssueForms((current) => ({ ...current, [item.id]: { ...form, quantity: event.target.value } }))} />
                    <button type="button" disabled={!item.quantityInStock || saving} onClick={() => submitIssue(item)} className={buttonClass}>Cấp</button>
                  </div></td>
              <td className={tdClass}><button type="button" className={secondaryButtonClass} onClick={() => { setEditingEquipmentId(item.id); setEquipmentForm({ code: item.code, name: item.name, category: item.category, size: item.size || '', unit: item.unit, quantityInStock: String(item.quantityInStock), note: item.note || '' }); contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>Sửa</button></td>
                </tr>;
              })}{!equipment.items.length && <tr><td className={`${tdClass} py-7 text-center text-slate-500`} colSpan="5">Chưa có mặt hàng trong kho.</td></tr>}</tbody>
            </table></div>
          </Panel>
          <Panel title="Lịch sử cấp và hoàn trả" description="Hiển thị tối đa 100 phiếu mới nhất.">
            <div className={tableWrap}><table className={tableClass}>
              <thead><tr>{['Ngày cấp', 'Học viên', 'Mặt hàng', 'Đã cấp', 'Đã trả', 'Thao tác'].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
              <tbody>{equipment.issues.map((issue) => <tr key={issue.id}>
                <td className={tdClass}>{moneyDate(issue.issuedAt)}</td><td className={tdClass}>{issue.sinhVien.hoTen}<p className="text-xs text-slate-500">{issue.maSinhVien}</p></td><td className={tdClass}>{issue.item.name}</td><td className={tdClass}>{issue.quantity} {issue.item.unit}</td><td className={tdClass}>{issue.returnedQuantity} {issue.item.unit}</td>
                <td className={tdClass}>{issue.quantity > issue.returnedQuantity ? <button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => returnIssue(issue)}>Ghi nhận trả</button> : <span className="text-emerald-700">Đã hoàn trả</span>}</td>
              </tr>)}{!equipment.issues.length && <tr><td className={`${tdClass} py-7 text-center text-slate-500`} colSpan="6">Chưa có giao dịch cấp phát.</td></tr>}</tbody>
            </table></div>
          </Panel>
        </div>}

        {activeTab === 'meetings' && <div className="space-y-5">
          <Panel title="Phòng giao ban" description="Tạo phòng sử dụng chung và quản lý sức chứa, vị trí.">
            <form onSubmit={submitMeetingRoom} className="mb-5 grid gap-3 md:grid-cols-5">
              <input className={fieldClass} required placeholder="Mã phòng" value={meetingRoomForm.code} onChange={(event) => setMeetingRoomForm({ ...meetingRoomForm, code: event.target.value })} />
              <input className={fieldClass} required placeholder="Tên phòng" value={meetingRoomForm.name} onChange={(event) => setMeetingRoomForm({ ...meetingRoomForm, name: event.target.value })} />
              <input className={fieldClass} required placeholder="Vị trí" value={meetingRoomForm.location} onChange={(event) => setMeetingRoomForm({ ...meetingRoomForm, location: event.target.value })} />
              <input className={fieldClass} required type="number" min="1" placeholder="Sức chứa" value={meetingRoomForm.capacity} onChange={(event) => setMeetingRoomForm({ ...meetingRoomForm, capacity: event.target.value })} />
              <div className="flex gap-2"><button disabled={saving} className={buttonClass}>{editingMeetingRoomId ? 'Lưu thay đổi' : 'Thêm phòng'}</button>{editingMeetingRoomId && <button type="button" className={secondaryButtonClass} onClick={() => { setEditingMeetingRoomId(''); setMeetingRoomForm({ code: '', name: '', location: '', capacity: '10' }); }}>Hủy</button>}</div>
            </form>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activeRooms.map((room) => <div key={room.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{room.name}</p><p className="mt-1 text-sm text-slate-500">{room.code} · {room.location}</p></div><button type="button" className={secondaryButtonClass} onClick={() => { setEditingMeetingRoomId(room.id); setMeetingRoomForm({ code: room.code, name: room.name, location: room.location, capacity: String(room.capacity) }); contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>Sửa</button></div><p className="mt-2 text-sm text-slate-700">Sức chứa {room.capacity} người · {room.bookings?.length || 0} lịch sắp tới</p>
            </div>)}{!activeRooms.length && <p className="text-sm text-slate-500">Chưa có phòng giao ban. Thêm phòng để đặt lịch.</p>}</div>
          </Panel>
          <Panel title="Đặt lịch giao ban" description="Hệ thống từ chối lịch bị trùng thời gian tại cùng một phòng.">
            <form onSubmit={submitBooking} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <select className={fieldClass} required value={bookingForm.meetingRoomId} onChange={(event) => setBookingForm({ ...bookingForm, meetingRoomId: event.target.value })}><option value="">Chọn phòng giao ban</option>{activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.location}</option>)}</select>
              <input className={fieldClass} required placeholder="Tên cuộc họp" value={bookingForm.title} onChange={(event) => setBookingForm({ ...bookingForm, title: event.target.value })} />
              <input className={fieldClass} required placeholder="Nội dung / mục đích" value={bookingForm.purpose} onChange={(event) => setBookingForm({ ...bookingForm, purpose: event.target.value })} />
              <label className="text-xs text-slate-500">Bắt đầu<input className={`${fieldClass} mt-1`} required type="datetime-local" value={bookingForm.startsAt} onChange={(event) => setBookingForm({ ...bookingForm, startsAt: event.target.value })} /></label>
              <label className="text-xs text-slate-500">Kết thúc<input className={`${fieldClass} mt-1`} required type="datetime-local" value={bookingForm.endsAt} onChange={(event) => setBookingForm({ ...bookingForm, endsAt: event.target.value })} /></label>
              <div className="flex items-end"><button disabled={saving || !activeRooms.length} className={buttonClass}><CalendarDays className="h-4 w-4" />Đặt lịch</button></div>
            </form>
          </Panel>
          <Panel title="Lịch sắp tới">
            <div className={tableWrap}><table className={tableClass}>
              <thead><tr>{['Phòng', 'Cuộc họp', 'Nội dung', 'Thời gian', 'Người tạo', ''].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
              <tbody>{meetingRooms.flatMap((room) => (room.bookings || []).map((booking) => ({ ...booking, room }))).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).map((booking) => <tr key={booking.id}>
                <td className={tdClass}>{booking.room.name}</td><td className={`${tdClass} font-semibold`}>{booking.title}</td><td className={tdClass}>{booking.purpose}</td><td className={tdClass}>{moneyDate(booking.startsAt)} – {moneyDate(booking.endsAt)}</td><td className={tdClass}>{booking.createdBy?.username || '—'}</td><td className={tdClass}><button className={secondaryButtonClass} disabled={saving} onClick={() => act(() => api.cancelMeetingBooking(booking.id), 'Đã hủy lịch giao ban.')}>Hủy lịch</button></td>
              </tr>)}{meetingRooms.every((room) => !room.bookings?.length) && <tr><td className={`${tdClass} py-7 text-center text-slate-500`} colSpan="6">Chưa có lịch sắp tới.</td></tr>}</tbody>
            </table></div>
          </Panel>
        </div>}
        </>}
      </div>
      </main>
    </div>
  </div>;
};

export default MilitaryManagement;
