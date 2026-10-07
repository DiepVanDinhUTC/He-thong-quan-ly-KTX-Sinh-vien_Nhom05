import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, KeyRound, Mail } from 'lucide-react';
import { authApi } from '../services/authApi';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requested, setRequested] = useState(false);
  const [debugCode, setDebugCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await authApi.requestPasswordReset(identifier);
      setRequested(true);
      setDebugCode(response.debugCode || '');
      setMessage(response.message || 'Nếu tài khoản tồn tại, mã xác minh đã được gửi tới email sinh viên.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi mã xác minh. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authApi.resetPassword({ identifier, code, newPassword });
      setMessage(response.message || 'Đã cập nhật mật khẩu.');
      window.setTimeout(() => navigate('/login'), 1300);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng kiểm tra mã xác minh.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
          <ArrowLeft size={16} /> Quay lại đăng nhập
        </Link>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Building size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Quên mật khẩu sinh viên</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Nhập mã sinh viên hoặc email đã đăng ký. Mã xác minh có hiệu lực trong 10 phút.</p>

        {!requested ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="reset-identifier">Mã sinh viên hoặc email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input id="reset-identifier" required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Mã sinh viên hoặc email" />
            </div>
            <button disabled={loading} className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{loading ? 'Đang gửi...' : 'Gửi mã xác minh'}</button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="reset-code">Mã xác minh 6 chữ số</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input id="reset-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 tracking-[0.3em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="000000" />
            </div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="new-password">Mật khẩu mới</label>
            <input id="new-password" required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Ít nhất 8 ký tự" />
            <button disabled={loading} className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}</button>
          </form>
        )}

        {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        {debugCode && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Mã thử nghiệm (chỉ hiện khi bật chế độ phát triển): <strong className="font-mono">{debugCode}</strong></p>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {requested && <button type="button" onClick={() => { setRequested(false); setCode(''); setNewPassword(''); setDebugCode(''); setMessage(''); }} className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-900">Gửi mã khác</button>}
      </section>
    </main>
  );
}
