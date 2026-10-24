import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBoardWorkspace } from '../components/BoardLayout';
import { KeyRound, Loader2, Pencil, RefreshCw, Search, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import AdminUserProfile from '../components/AdminUserProfile';
import Sidebar from '../components/Sidebar';
import { staffAccountApi } from '../services/staffAccountApi';

const ROLE_LABELS = {
  ARCHIVIST: 'Hồ sơ lưu trữ',
  ACCOUNTANT: 'Kế toán',
  TREASURER: 'Thủ quỹ',
  FACILITIES_MANAGER: 'Quản lý cơ sở vật chất',
  BUILDING_MANAGER: 'Quản lý tòa nhà',
  SECURITY: 'Trật tự, trị an',
  MILITARY_OFFICER: 'Quản lý quân sự',
  MEDICAL_OFFICER: 'Cán bộ y tế',
  SERVICE_PROVIDER: 'Nhà cung cấp dịch vụ',
};

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100';

const profileFromAccount = (account) => ({
  username: account.username || '',
  hoTen: account.employee?.hoTen || '',
  chucVu: account.employee?.chucVu || '',
  email: account.employee?.email || '',
  phone: account.employee?.phone || '',
  cccd: account.employee?.cccd || '',
  queQuan: account.employee?.queQuan || '',
  danToc: account.employee?.danToc || '',
  ngaySinh: account.employee?.ngaySinh ? new Date(account.employee.ngaySinh).toISOString().slice(0, 10) : '',
  gioiTinh: String(Boolean(account.employee?.gioiTinh)),
});

const StaffAccountManagement = () => {
  const isBoardWorkspace = useBoardWorkspace();
  const ContentTag = isBoardWorkspace ? 'div' : 'main';
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dialogError, setDialogError] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await staffAccountApi.list();
      setAccounts(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách tài khoản nhân viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return accounts;
    return accounts.filter((account) => {
      const employee = account.employee || {};
      return [
        account.username,
        employee.maNhanVien,
        employee.hoTen,
        employee.chucVu,
        employee.email,
        employee.phone,
        ROLE_LABELS[account.role],
      ].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query));
    });
  }, [accounts, search]);

  const openProfile = (account) => {
    setDialog({ type: 'profile', account });
    setProfile(profileFromAccount(account));
    setDialogError('');
    setNotice('');
  };

  const openPassword = (account) => {
    setDialog({ type: 'password', account });
    setPassword('');
    setConfirmPassword('');
    setDialogError('');
    setNotice('');
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
    setProfile(null);
    setPassword('');
    setConfirmPassword('');
    setDialogError('');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!dialog || !profile) return;
    setSaving(true);
    setDialogError('');
    try {
      const payload = {
        ...profile,
        gioiTinh: profile.gioiTinh === 'true',
      };
      const response = await staffAccountApi.update(dialog.account.employee.maNhanVien, payload);
      setAccounts((current) => current.map((account) => (
        account.employee.maNhanVien === response.data.employee.maNhanVien ? response.data : account
      )));
      setDialog(null);
      setNotice(response.message || 'Đã cập nhật thông tin nhân viên.');
    } catch (requestError) {
      setDialogError(requestError.response?.data?.message || 'Không thể cập nhật tài khoản nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (!dialog) return;
    if (password.length < 8 || password.length > 128) {
      setDialogError('Mật khẩu mới cần có từ 8 đến 128 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setDialogError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSaving(true);
    setDialogError('');
    try {
      const response = await staffAccountApi.changePassword(dialog.account.employee.maNhanVien, password);
      setDialog(null);
      setPassword('');
      setConfirmPassword('');
      setNotice(response.message || 'Đã đổi mật khẩu tài khoản nhân viên.');
    } catch (requestError) {
      setDialogError(requestError.response?.data?.message || 'Không thể đổi mật khẩu tài khoản nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={isBoardWorkspace ? 'w-full' : 'flex h-screen min-h-0 overflow-hidden bg-slate-50 text-slate-800'}>
      {!isBoardWorkspace && <Sidebar />}
      <ContentTag className={isBoardWorkspace ? '' : 'min-h-0 min-w-0 flex-1 overflow-y-auto'}>
        {!isBoardWorkspace && <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Ban quản lý KTX</p>
            <h1 className="mt-0.5 text-lg font-bold sm:text-xl">Quản lý tài khoản nhân viên</h1>
          </div>
          <AdminUserProfile variant="header" />
        </header>}

        <div className={isBoardWorkspace ? 'space-y-5' : 'mx-auto max-w-7xl space-y-5 p-4 sm:p-7'}>
          <section className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 p-5 text-white shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><UserCog className="h-6 w-6" /></span>
                  <h2 className="text-xl font-bold">Tài khoản nhân viên</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-blue-100">Cập nhật tên đăng nhập, hồ sơ công tác và thông tin liên hệ; đặt mật khẩu mới khi nhân viên cần hỗ trợ đăng nhập.</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Số tài khoản</p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-bold"><Users className="h-5 w-5" />{accounts.length}</p>
              </div>
            </div>
          </section>

          {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div>}
          {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={loadAccounts} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-white"><RefreshCw className="h-4 w-4" />Thử lại</button></div>}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="font-bold">Danh sách nhân viên</h2>
                <p className="mt-1 text-xs text-slate-500">Không hiển thị mật khẩu hiện tại của tài khoản.</p>
              </div>
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1 sm:w-80 sm:flex-none">
                  <span className="sr-only">Tìm nhân viên</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, tài khoản, mã NV..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <button type="button" onClick={loadAccounts} disabled={loading} aria-label="Tải lại danh sách" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải danh sách...</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-12 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{accounts.length ? 'Không tìm thấy tài khoản phù hợp.' : 'Chưa có tài khoản nhân viên.'}</p><p className="mt-1 text-sm text-slate-500">{accounts.length ? 'Thử từ khóa khác.' : 'Tài khoản cần được liên kết với hồ sơ nhân viên.'}</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAccounts.map((account) => {
                  const employee = account.employee;
                  return (
                    <article key={employee.maNhanVien} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-slate-900">{employee.hoTen}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${account.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{account.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span></div>
                          <p className="mt-1 text-sm text-slate-600"><span className="font-medium">{account.username}</span><span className="mx-2 text-slate-300">·</span>{employee.maNhanVien}<span className="mx-2 text-slate-300">·</span>{ROLE_LABELS[account.role] || account.role}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{employee.chucVu} · {employee.email} · {employee.phone}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 pl-14 sm:pl-0">
                        <button type="button" onClick={() => openProfile(account)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"><Pencil className="h-4 w-4" /><span>Sửa thông tin</span></button>
                        <button type="button" onClick={() => openPassword(account)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"><KeyRound className="h-4 w-4" /><span>Đổi mật khẩu</span></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Chỉ trưởng ban và phó trưởng ban có thể mở chức năng này. Mật khẩu mới không được lưu dưới dạng văn bản thường.</p>
        </div>
      </ContentTag>

      {dialog && (
        <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="staff-dialog-title" className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{dialog.account.employee.maNhanVien}</p>
                <h2 id="staff-dialog-title" className="mt-1 text-lg font-bold">{dialog.type === 'profile' ? 'Cập nhật hồ sơ nhân viên' : 'Đổi mật khẩu tài khoản'}</h2>
                <p className="mt-1 text-sm text-slate-500">{dialog.account.employee.hoTen} · {dialog.account.username}</p>
              </div>
              <button type="button" disabled={saving} onClick={closeDialog} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>

            {dialog.type === 'profile' && profile ? (
              <form onSubmit={saveProfile}>
                <div className="grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
                  <label className="text-sm font-semibold text-slate-700">Tên đăng nhập<input required maxLength={50} autoComplete="username" value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">Họ và tên<input required maxLength={100} value={profile.hoTen} onChange={(event) => setProfile({ ...profile, hoTen: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">Chức vụ<input required maxLength={100} value={profile.chucVu} onChange={(event) => setProfile({ ...profile, chucVu: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">Email<input required type="email" maxLength={100} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">Số điện thoại<input required maxLength={15} value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">CCCD<input required maxLength={20} value={profile.cccd} onChange={(event) => setProfile({ ...profile, cccd: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">Ngày sinh<input type="date" value={profile.ngaySinh} onChange={(event) => setProfile({ ...profile, ngaySinh: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">Giới tính<select value={profile.gioiTinh} onChange={(event) => setProfile({ ...profile, gioiTinh: event.target.value })} className={inputClass}><option value="true">Nam</option><option value="false">Nữ</option></select></label>
                  <label className="text-sm font-semibold text-slate-700">Quê quán<input required maxLength={255} value={profile.queQuan} onChange={(event) => setProfile({ ...profile, queQuan: event.target.value })} className={inputClass} /></label>
                  <label className="text-sm font-semibold text-slate-700">Dân tộc<input required maxLength={50} value={profile.danToc} onChange={(event) => setProfile({ ...profile, danToc: event.target.value })} className={inputClass} /></label>
                  {dialogError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{dialogError}</p>}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                  <button type="button" disabled={saving} onClick={closeDialog} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">Hủy</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Lưu thông tin</button>
                </div>
              </form>
            ) : (
              <form onSubmit={savePassword}>
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-5 text-blue-900">Nhập mật khẩu mới và gửi mật khẩu đó cho nhân viên qua kênh riêng. Hệ thống không thể xem lại mật khẩu sau khi lưu.</div>
                  <label className="block text-sm font-semibold text-slate-700">Mật khẩu mới<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Từ 8 đến 128 ký tự" /></label>
                  <label className="block text-sm font-semibold text-slate-700">Nhập lại mật khẩu mới<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} /></label>
                  {dialogError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{dialogError}</p>}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                  <button type="button" disabled={saving} onClick={closeDialog} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">Hủy</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Lưu mật khẩu mới</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default StaffAccountManagement;
