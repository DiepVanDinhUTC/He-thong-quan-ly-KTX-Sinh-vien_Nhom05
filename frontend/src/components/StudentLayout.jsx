import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BedDouble, Building, ChevronDown, Home, LockKeyhole,
  LogOut, Mail, PackageCheck, Receipt, Shield, UserRound, Wrench, X,
} from 'lucide-react';
import { authApi } from '../services/authApi';
import StudentNotificationBell from './StudentNotificationBell';
import { logout, userUpdated } from '../store/authSlice';
import { isMilitaryLearner } from '../utils/studentResidence';

const navLinkClass = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
  isActive ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-800'
}`;

const StudentLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authenticatedUser = useSelector((state) => state.auth.user);
  const [student, setStudent] = useState(authenticatedUser);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModal, setProfileModal] = useState('');
  const [contact, setContact] = useState({ email: authenticatedUser?.email || '', phone: authenticatedUser?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const studentName = student?.hoTen || student?.username || 'Sinh viên';
  const initials = studentName.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
  const roleLabel = isMilitaryLearner(authenticatedUser) ? 'Sinh viên · Học viên GDQP' : 'Sinh viên';

  useEffect(() => {
    let active = true;
    authApi.me().then((response) => {
      if (!active) return;
      if (!['STUDENT', 'MILITARY_STUDENT'].includes(response.user.role)) {
        navigate('/', { replace: true });
        return;
      }
      setStudent(response.user);
      setContact({ email: response.user.email || '', phone: response.user.phone || '' });
      dispatch(userUpdated(response.user));
    }).catch((error) => {
      if (!active) return;
      if (error.response?.status === 401) {
        dispatch(logout());
        navigate('/login', { replace: true });
      }
    });
    return () => { active = false; };
  }, [dispatch, navigate, location.pathname]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const startProfileAction = (action) => {
    setMessage({ type: '', text: '' });
    setProfileMenuOpen(false);
    setProfileModal(action);
    setContact({ email: student?.email || '', phone: student?.phone || '' });
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const saveContact = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await authApi.updateMyContact(contact);
      setStudent(response.user);
      dispatch(userUpdated(response.user));
      setProfileModal('');
      setMessage({ type: 'success', text: 'Đã cập nhật thông tin liên lạc.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể cập nhật thông tin liên lạc.' });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await authApi.changeMyPassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setProfileModal('');
      setMessage({ type: 'success', text: response.message || 'Đã đổi mật khẩu.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể đổi mật khẩu.' });
    } finally {
      setSaving(false);
    }
  };

  const mobileLinks = [
    { to: '/student-portal', label: 'Trang chủ', Icon: Home, end: true },
    { to: '/my-room', label: 'Phòng ở', Icon: BedDouble },
    ...(isMilitaryLearner(authenticatedUser) ? [{ to: '/military-stay', label: 'GDQP', Icon: Shield }] : []),
    { to: '/service-registration', label: 'Dịch vụ', Icon: PackageCheck },
    { to: '/bill-payment', label: 'Hóa đơn', Icon: Receipt },
    { to: '/ticket-report', label: 'Báo hỏng', Icon: Wrench },
  ];

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 text-slate-800">
      <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r bg-white px-4 py-4 md:flex">
        <Link to="/student-portal" className="mb-5 flex shrink-0 items-center gap-3 rounded-xl px-2 py-2" aria-label="Cổng sinh viên KTX">
          <span className="rounded-xl bg-blue-900 p-2.5 text-white"><Building className="h-5 w-5" /></span>
          <span className="min-w-0"><span className="block truncate font-bold text-blue-900">Cổng sinh viên KTX</span><span className="text-xs text-gray-500">ĐH GTVT</span></span>
        </Link>
        <nav aria-label="Điều hướng chính" className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          <NavLink to="/student-portal" end className={navLinkClass}><Home className="h-5 w-5 shrink-0" />Tổng quan</NavLink>
          {student?.role === 'STUDENT' && <NavLink to="/room-registration" className={navLinkClass}><Building className="h-5 w-5 shrink-0" />Đăng ký nội trú</NavLink>}
          <NavLink to="/my-room" className={navLinkClass}><BedDouble className="h-5 w-5 shrink-0" />{student?.role === 'MILITARY_STUDENT' && !authenticatedUser?.currentContract ? 'Tra cứu phòng' : 'Phòng ở & yêu cầu'}</NavLink>
          {isMilitaryLearner(authenticatedUser) && <NavLink to="/military-stay" className={navLinkClass}><Shield className="h-5 w-5 shrink-0" />Đợt học GDQP</NavLink>}
          <NavLink to="/service-registration" className={navLinkClass}><PackageCheck className="h-5 w-5 shrink-0" />Đăng ký dịch vụ</NavLink>
          <NavLink to="/bill-payment" className={navLinkClass}><Receipt className="h-5 w-5 shrink-0" />Hóa đơn & thanh toán</NavLink>
          <NavLink to="/ticket-report" className={navLinkClass}><Wrench className="h-5 w-5 shrink-0" />Báo hỏng CSVC</NavLink>
        </nav>
        <div className="shrink-0 border-t pt-3">
          <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials || <UserRound className="h-5 w-5" />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{studentName}</span><span className="block truncate text-xs text-gray-500">{student?.maSV || student?.username || ''}</span></span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-20 md:pb-0">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 py-3 shadow-sm sm:px-6">
          <Link to="/student-portal" className="flex min-w-0 items-center gap-2" aria-label="Về trang chủ sinh viên">
            <span className="rounded-lg bg-blue-900 p-2 text-white"><Building className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-bold text-blue-950">Cổng sinh viên KTX</span><span className="block text-xs text-slate-500">{roleLabel}</span></span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <StudentNotificationBell />
            <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-label="Mở tài khoản" aria-expanded={profileMenuOpen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 ring-2 ring-white">
              {initials || <UserRound className="h-5 w-5" />}
            </button>
          </div>
        </header>
        {message.text && !profileModal && <div role="status" className={`fixed right-4 top-4 z-40 rounded-lg px-4 py-3 text-sm shadow-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message.text}</div>}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {profileMenuOpen && <>
        <button type="button" aria-label="Đóng menu tài khoản" className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileMenuOpen(false)} />
        <div className="fixed right-3 top-16 z-50 w-64 rounded-xl border bg-white p-2 shadow-xl">
          <p className="truncate px-3 py-2 text-xs text-gray-500">{studentName} · {student?.maSV || student?.username}</p>
          <button type="button" onClick={() => startProfileAction('contact')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50"><Mail className="h-4 w-4" />Thông tin liên lạc</button>
          <button type="button" onClick={() => startProfileAction('password')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50"><LockKeyhole className="h-4 w-4" />Đổi mật khẩu</button>
          <button type="button" onClick={() => { dispatch(logout()); navigate('/login', { replace: true }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Đăng xuất</button>
        </div>
      </>}

      <nav aria-label="Điều hướng nhanh" className={`fixed inset-x-0 bottom-0 z-30 grid ${mobileLinks.length === 6 ? 'grid-cols-6' : 'grid-cols-5'} border-t bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur md:hidden`}>
        {mobileLinks.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium ${isActive ? 'text-blue-800' : 'text-slate-500'}`}>
          {({ isActive }) => <><Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} /><span className="max-w-full truncate">{label}</span></>}
        </NavLink>)}
      </nav>

      {profileModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setProfileModal(''); }}>
        <form onSubmit={profileModal === 'contact' ? saveContact : savePassword} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{profileModal === 'contact' ? 'Thông tin liên lạc' : 'Đổi mật khẩu'}</h2><p className="mt-1 text-sm text-gray-500">Tài khoản {student?.maSV || student?.username}</p></div><button type="button" onClick={() => setProfileModal('')} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
          {profileModal === 'contact' ? <>
            <label className="block text-sm font-medium">Email<input type="email" required maxLength={100} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5" /></label>
            <label className="block text-sm font-medium">Số điện thoại<input type="tel" required maxLength={15} value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5" /></label>
          </> : <>
            <label className="block text-sm font-medium">Mật khẩu hiện tại<input type="password" required autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5" /></label>
            <label className="block text-sm font-medium">Mật khẩu mới<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5" /><span className="mt-1 block text-xs text-gray-500">Tối thiểu 8 ký tự.</span></label>
            <label className="block text-sm font-medium">Xác nhận mật khẩu mới<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5" /></label>
          </>}
          {message.text && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message.text}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" disabled={saving} onClick={() => setProfileModal('')} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
        </form>
      </div>}
    </div>
  );
};

export default StudentLayout;
