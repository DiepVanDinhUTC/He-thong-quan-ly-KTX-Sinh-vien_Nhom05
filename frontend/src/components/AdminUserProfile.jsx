/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { authApi } from '../services/authApi';
import { logout, userUpdated } from '../store/authSlice';

const roleLabels = {
  BOARD_CHAIR: 'Trưởng phòng',
  BOARD_DEPUTY: 'Phó phòng',
  ARCHIVIST: 'Hồ sơ lưu trữ',
  ACCOUNTANT: 'Kế toán',
  TREASURER: 'Thủ quỹ',
  FACILITIES_MANAGER: 'Cơ sở vật chất',
  BUILDING_MANAGER: 'Quản lý tòa nhà',
  SECURITY: 'Trật tự - trị an',
  MILITARY_OFFICER: 'Cán bộ Quản lý quân sự',
  MEDICAL_OFFICER: 'Cán bộ y tế',
  SERVICE_PROVIDER: 'Nhà cung cấp dịch vụ',
  STUDENT: 'Sinh viên',
  MILITARY_STUDENT: 'Học viên quân sự',
  ADMIN: 'Quản trị viên kiểm thử',
};

const ProfileDisplay = ({ variant = 'sidebar', compact = false, light = false }) => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user || !localStorage.getItem('accessToken')) return undefined;

    let isMounted = true;
    authApi.me()
      .then((response) => {
        if (isMounted) dispatch(userUpdated(response.user));
      })
      .catch((error) => {
        if (isMounted && error.response?.status === 401) {
          dispatch(logout());
          navigate('/login', { replace: true });
        }
      });

    return () => { isMounted = false; };
  }, [dispatch, navigate, user]);

  const name = user?.hoTen || user?.username || 'Cán bộ quản lý';
  const role = user?.chucVu || roleLabels[user?.role] || 'Phòng Chăm sóc người học';
  const staffId = user?.maNhanVien || null;

  if (variant === 'header') {
    return (
      <div className="flex shrink-0 items-center gap-3 pl-4 border-l border-gray-200">
        <div className="hidden text-right md:block">
          <p className="text-sm font-bold leading-none text-gray-800">{name}</p>
          <p className="mt-1 text-xs font-medium text-gray-500">{staffId ? `${role} · ${staffId}` : role}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-blue-700 shadow-sm">
          <User className="h-5 w-5" />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex shrink-0 justify-center" title={`${name} · ${role}`} aria-label={`${name}, ${role}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700">
          <User className="h-5 w-5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700">
        <User className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className={`truncate text-sm font-medium ${light ? 'text-slate-900' : 'text-white'}`}>{name}</p>
        <p className={`truncate text-xs ${light ? 'text-slate-500' : 'text-blue-300'}`}>{staffId ? `${role} · ${staffId}` : role}</p>
      </div>
    </div>
  );
};

const AdminUserProfile = (props) => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState('');
  const [contact, setContact] = useState({ hoTen: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const open = (action) => {
    setMenu(false); setMessage(''); setModal(action);
    setContact({ hoTen: user?.hoTen || '', email: user?.email || '', phone: user?.phone || '' });
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  const save = async (event) => {
    event.preventDefault();
    if (modal === 'password' && passwords.newPassword !== passwords.confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp.'); return;
    }
    setSaving(true); setMessage('');
    try {
      if (modal === 'contact') {
        const response = await authApi.updateMyContact(contact);
        dispatch(userUpdated(response.user));
      } else {
        await authApi.changeMyPassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      }
      setModal(''); setMessage('Đã lưu thay đổi.');
    } catch (error) { setMessage(error.response?.data?.message || 'Không thể lưu thay đổi.'); }
    finally { setSaving(false); }
  };
  return <div className="relative">
    <button type="button" className="w-full text-left" aria-label="Mở menu tài khoản" aria-expanded={menu} onClick={() => setMenu(!menu)}><ProfileDisplay {...props} /></button>
    {menu && <div className={`absolute z-50 w-64 rounded-xl border bg-white p-2 text-slate-800 shadow-xl ${props.variant === 'header' ? 'right-0 top-full mt-2' : 'bottom-full left-0 mb-2'}`}>
      <p className="truncate px-3 py-2 text-sm text-slate-500">{user?.hoTen || user?.username} · {user?.maNhanVien || user?.username}</p>
      {message && <p role="status" className="px-3 text-sm text-green-700">{message}</p>}
      {user?.maNhanVien && <button type="button" onClick={() => open('contact')} className="block w-full rounded-lg px-3 py-3 text-left hover:bg-slate-100">Thông tin cá nhân</button>}
      <button type="button" onClick={() => open('password')} className="block w-full rounded-lg px-3 py-3 text-left hover:bg-slate-100">Đổi mật khẩu</button>
      <button type="button" onClick={() => { dispatch(logout()); navigate('/login', { replace: true }); }} className="block w-full rounded-lg px-3 py-3 text-left text-red-600 hover:bg-red-50">Đăng xuất</button>
    </div>}
    {modal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(''); }}>
      <form onSubmit={save} role="dialog" aria-modal="true" aria-label={modal === 'contact' ? 'Thông tin cá nhân' : 'Đổi mật khẩu'} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
        <h2 className="text-lg font-bold">{modal === 'contact' ? 'Thông tin cá nhân' : 'Đổi mật khẩu'}</h2>
        {modal === 'contact' ? <>
          <label className="block text-sm">Họ và tên<input required maxLength={100} value={contact.hoTen} onChange={(e) => setContact({ ...contact, hoTen: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          <label className="block text-sm">Email<input type="email" required maxLength={100} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          <label className="block text-sm">Số điện thoại<input type="tel" required maxLength={15} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        </> : <>
          {[[ 'currentPassword', 'Mật khẩu hiện tại', 'current-password' ], [ 'newPassword', 'Mật khẩu mới', 'new-password' ], [ 'confirmPassword', 'Xác nhận mật khẩu mới', 'new-password' ]].map(([key, label, autoComplete]) => <label key={key} className="block text-sm">{label}<input type="password" required minLength={key === 'currentPassword' ? undefined : 8} maxLength={128} autoComplete={autoComplete} value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>)}
        </>}
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setModal('')} className="rounded-lg border px-4 py-2">Hủy</button><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
      </form>
    </div>}
  </div>;
};

export default AdminUserProfile;
