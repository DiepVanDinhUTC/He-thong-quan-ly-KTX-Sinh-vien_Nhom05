import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BedDouble, Building, ChevronDown, Home, LockKeyhole,
  LogOut, Mail, Receipt, UserRound, Wrench, X
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { logout, userUpdated } from '../store/authSlice';

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

  useEffect(() => {
    let active = true;
    authApi.me().then((response) => {
      if (!active) return;
      if (response.user.role !== 'STUDENT') {
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
  }, [dispatch, navigate]);

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

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r bg-white px-2 py-4 sm:w-64 sm:px-4">
        <Link to="/student-portal" className="mb-5 flex items-center justify-center gap-3 rounded-xl px-1 py-2 sm:justify-start sm:px-2" aria-label="Cổng sinh viên KTX">
          <span className="rounded-xl bg-blue-900 p-2.5 text-white"><Building className="h-5 w-5" /></span>
          <span className="hidden min-w-0 sm:block"><span className="block truncate font-bold text-blue-900">Cổng sinh viên KTX</span><span className="text-xs text-gray-500">ĐH GTVT</span></span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavLink to="/student-portal" end className={navLinkClass} title="Tổng quan"><Home className="h-5 w-5 shrink-0" /><span className="hidden sm:inline">Tổng quan</span></NavLink>
          <NavLink to="/room-registration" className={navLinkClass} title="Đăng ký nội trú"><Building className="h-5 w-5 shrink-0" /><span className="hidden sm:inline">Đăng ký nội trú</span></NavLink>
          <NavLink to="/my-room" className={navLinkClass} title="Phòng của tôi"><BedDouble className="h-5 w-5 shrink-0" /><span className="hidden sm:inline">Phòng của tôi</span></NavLink>
          <NavLink to="/bill-payment" className={navLinkClass} title="Hóa đơn & Thanh toán"><Receipt className="h-5 w-5 shrink-0" /><span className="hidden sm:inline">Hóa đơn & Thanh toán</span></NavLink>
          <NavLink to="/ticket-report" className={navLinkClass} title="Báo cáo sửa chữa"><Wrench className="h-5 w-5 shrink-0" /><span className="hidden sm:inline">Báo cáo sửa chữa</span></NavLink>
        </nav>

        <div className="relative border-t pt-3">
          {profileMenuOpen && <div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-xl border bg-white p-2 shadow-xl sm:left-0">
            <p className="truncate px-3 py-2 text-xs text-gray-500">{student?.maSV || student?.username}</p>
            <button type="button" onClick={() => startProfileAction('contact')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"><Mail className="h-4 w-4" />Thông tin liên lạc</button>
            <button type="button" onClick={() => startProfileAction('password')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"><LockKeyhole className="h-4 w-4" />Đổi mật khẩu</button>
            <button type="button" onClick={() => { dispatch(logout()); navigate('/login', { replace: true }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Đăng xuất</button>
          </div>}
          <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} className="flex w-full items-center justify-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50 sm:justify-start">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials || <UserRound className="h-5 w-5" />}</span>
            <span className="hidden min-w-0 flex-1 sm:block"><span className="block truncate text-sm font-semibold">{studentName}</span><span className="block truncate text-xs text-gray-500">{student?.maSV || student?.username || ''}</span></span>
            <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {message.text && !profileModal && <div role="status" className={`fixed right-4 top-4 z-40 rounded-lg px-4 py-3 text-sm shadow-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message.text}</div>}
        <Outlet />
      </div>

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
