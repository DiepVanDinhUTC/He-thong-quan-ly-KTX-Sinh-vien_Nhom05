import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, ShieldCheck, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { adminTestAccountChanged, userUpdated } from '../store/authSlice';
import { homeForRole } from '../utils/accessControl';

const AdminTestSwitcher = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const selectedUsername = useSelector((state) => state.auth.adminTestAccount);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsRevision, setAccountsRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const visible = Boolean(token && user && (user.role === 'ADMIN' || selectedUsername));
  const activeAccount = useMemo(
    () => accounts.find((account) => account.username === selectedUsername),
    [accounts, selectedUsername]
  );

  useEffect(() => {
    if (!open || accountsLoaded) return;
    let active = true;
    authApi.adminTestAccounts()
      .then((response) => {
        if (!active) return;
        setAccounts(response.data || []);
        setAccountsLoaded(true);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.data?.message || 'Không thể tải tài khoản kiểm thử.');
      });
    return () => { active = false; };
  }, [accountsLoaded, accountsRevision, open]);

  const switchTo = async (username) => {
    const previousUsername = localStorage.getItem('adminTestAccount');
    setBusy(true);
    setError('');
    localStorage.setItem('adminTestAccount', username);
    try {
      const response = await authApi.me();
      if (!response?.user) throw new Error('Không nhận được thông tin tài khoản kiểm thử.');
      dispatch(userUpdated(response.user));
      dispatch(adminTestAccountChanged(username));
      setOpen(false);
      navigate(homeForRole(response.user.role), { replace: true });
    } catch (requestError) {
      if (previousUsername) localStorage.setItem('adminTestAccount', previousUsername);
      else localStorage.removeItem('adminTestAccount');
      setError(requestError.response?.data?.message || requestError.message || 'Không thể chuyển tài khoản kiểm thử.');
    } finally {
      setBusy(false);
    }
  };

  const returnToAdmin = async () => {
    const previousUsername = localStorage.getItem('adminTestAccount');
    localStorage.removeItem('adminTestAccount');
    setBusy(true);
    setError('');
    try {
      const response = await authApi.me();
      if (response?.user?.role !== 'ADMIN') throw new Error('Phiên đăng nhập hiện tại không phải ADMIN.');
      dispatch(userUpdated(response.user));
      dispatch(adminTestAccountChanged(null));
      setOpen(false);
      navigate('/', { replace: true });
    } catch (requestError) {
      if (previousUsername) localStorage.setItem('adminTestAccount', previousUsername);
      setError(requestError.response?.data?.message || requestError.message || 'Không thể quay lại tài khoản ADMIN.');
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(24rem,calc(100vw-2rem))] font-sans">
      {open ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-blue-700" />Kiểm thử bằng tài khoản ADMIN</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Chọn một tài khoản để thử đúng luồng và quyền của vai trò đó.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-3 p-4">
            <label className="block text-xs font-semibold text-slate-700">Tài khoản vai trò cần thử
              <select disabled={busy || !accountsLoaded} value={selectedUsername || ''} onChange={(event) => { if (event.target.value) switchTo(event.target.value); }} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50">
                <option value="">{accountsLoaded ? 'Chọn tài khoản…' : 'Đang tải tài khoản…'}</option>
                {accounts.map((account) => <option key={account.username} value={account.username}>{account.roleLabel} · {account.displayName} ({account.username})</option>)}
              </select>
            </label>

            {selectedUsername && <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">Đang thử với <strong>{activeAccount?.displayName || user?.hoTen || selectedUsername}</strong>. Các thao tác sẽ dùng dữ liệu và quyền của tài khoản này.</div>}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Chế độ này chỉ dành cho kiểm thử. Thao tác lưu sẽ cập nhật dữ liệu trong cơ sở dữ liệu.</div>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <button type="button" disabled={busy || !selectedUsername} onClick={returnToAdmin} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Quay lại ADMIN</button>
              <button type="button" onClick={() => { setAccountsLoaded(false); setAccounts([]); setAccountsRevision((value) => value + 1); setError(''); }} className="rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Tải lại tài khoản</button>
            </div>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => { setOpen(true); setError(''); }} className="ml-auto flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-3 text-left text-xs font-bold text-blue-900 shadow-lg transition hover:bg-blue-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-blue-700" />}
          <span>{selectedUsername ? `Đang thử: ${activeAccount?.roleLabel || user?.role || 'vai trò'}` : 'ADMIN · Chế độ kiểm thử'}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default AdminTestSwitcher;
