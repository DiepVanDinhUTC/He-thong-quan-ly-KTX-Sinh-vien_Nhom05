import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, History, Loader2, QrCode, Receipt, RefreshCw } from 'lucide-react';
import { paymentApi } from '../services/paymentApi';

const money = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;
const formatDate = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleDateString('vi-VN');
};
const formatDateTime = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleString('vi-VN');
};

const BillPayment = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [vnpayPayments, setVnpayPayments] = useState([]);
  const [monthlyInvoices, setMonthlyInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('unpaid');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPayments = useCallback(async () => {
    const data = await paymentApi.mine();
    setContracts(data.contracts || []);
    setPayments(data.payments || []);
    setVnpayPayments(data.vnpayPayments || []);
    setMonthlyInvoices(data.monthlyInvoices || []);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    loadPayments().then(() => { if (active) setError(''); }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Không thể tải thông tin thanh toán.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadPayments]);

  useEffect(() => {
    const txnRef = new URLSearchParams(window.location.search).get('vnp_TxnRef');
    if (!txnRef) return undefined;
    let active = true;
    let attempts = 0;
    const checkResult = async () => {
      try {
        const data = await loadPayments();
        const transaction = (data.vnpayPayments || []).find((payment) => payment.txnRef === txnRef);
        if (transaction?.status === 'PAID') {
          setActiveTab('history');
          setNotice(`Đã ghi nhận thanh toán hóa đơn ${transaction.invoiceId} của sinh viên ${transaction.maSinhVien}.`);
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        }
        if (transaction?.status === 'FAILED') {
          setNotice(`Giao dịch hóa đơn ${transaction.invoiceId} chưa thành công. Bạn có thể tạo giao dịch mới để thanh toán lại.`);
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        }
        attempts += 1;
        if (attempts >= 12) {
          setNotice('VNPAY đã trả bạn về hệ thống. Trạng thái đang được đối soát; hãy làm mới sau ít phút.');
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        }
      } catch { /* The student can use the refresh control if the server is temporarily unavailable. */ }
      return false;
    };
    let timer;
    checkResult().then((done) => {
      if (!done && active) timer = window.setInterval(async () => {
        if (await checkResult()) window.clearInterval(timer);
      }, 5000);
    });
    return () => { active = false; window.clearInterval(timer); };
  }, [loadPayments]);

  const startPayment = async (invoiceType, invoiceId) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await paymentApi.createVnpayPayment(invoiceType, invoiceId);
      window.location.assign(response.data.paymentUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tạo giao dịch VNPAY.');
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await loadPayments();
      setNotice('Đã cập nhật trạng thái hóa đơn và biên lai.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể cập nhật dữ liệu.');
    } finally {
      setBusy(false);
      setLoading(false);
    }
  };

  const unpaidContracts = contracts.filter((contract) => contract.trangThai === 'PENDING_PAYMENT');
  const unpaidMonthlyInvoices = monthlyInvoices.filter((invoice) => invoice.status === 'UNPAID');
  const receiptCount = payments.filter((payment) => payment.phuongThuc !== 'VNPAY').length
    + vnpayPayments.filter((payment) => payment.status === 'PAID').length;
  const tabs = [
    { key: 'unpaid', label: 'Chờ thanh toán', count: unpaidContracts.length, Icon: Clock3 },
    { key: 'monthly', label: 'Hóa đơn tháng', count: unpaidMonthlyInvoices.length, Icon: Receipt },
    { key: 'history', label: 'Biên lai', count: receiptCount, Icon: History },
  ];

  return <main className="bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => navigate('/student-portal')} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0"><h1 className="truncate font-bold">Hóa đơn & thanh toán</h1><p className="text-xs text-slate-500">Thanh toán QR VNPAY và tra cứu biên lai</p></div>
        </div>
        <button type="button" onClick={refresh} disabled={busy || loading} aria-label="Làm mới hóa đơn" title="Làm mới hóa đơn" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:px-3">
          {busy || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="hidden sm:inline">Làm mới</span>
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div role="group" aria-label="Các nhóm hóa đơn" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
        {tabs.map(({ key, label, count, Icon }) => <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => setActiveTab(key)} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2.5 text-center text-[11px] font-semibold sm:flex-row sm:gap-2 sm:px-2 sm:text-sm ${activeTab === key ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500'}`}>
          <Icon className="h-4 w-4 shrink-0" /><span>{label} <span className="opacity-70">({count})</span></span>
        </button>)}
      </div>

      {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-700" />Đang tải hóa đơn…</div> : activeTab === 'unpaid' ? <section className="space-y-3">
        {unpaidContracts.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-semibold">Không có phí hợp đồng chờ thanh toán</p></div> : unpaidContracts.map((contract) => <article key={contract.maHopDong} className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${contract.isOverdue ? 'border-red-300 bg-red-50/40' : 'bg-white'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><p className="font-bold">Phí hợp đồng lưu trú</p><p className="mt-1 text-xs text-slate-500">Mã hóa đơn {contract.maHopDong} · Phòng {contract.phong?.soPhong || contract.maPhong}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${contract.isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{contract.isOverdue ? 'Quá hạn thanh toán' : 'Chờ thanh toán'}</span></div>
          <div className="flex flex-wrap items-end justify-between gap-4 pt-4"><div><p className="text-xs text-slate-500">Thời hạn lưu trú</p><p className="mt-1 text-sm">{formatDate(contract.ngayBatDau)} – {formatDate(contract.ngayKetThuc)}</p><p className="mt-3 text-xs text-slate-500">Tổng phí</p><p className="text-2xl font-bold text-blue-800">{money(contract.tongTien)}</p></div><button type="button" onClick={() => startPayment('CONTRACT', contract.maHopDong)} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-50 sm:w-auto"><QrCode className="h-4 w-4" />Thanh toán QR VNPAY</button></div>
        </article>)}
      </section> : activeTab === 'monthly' ? <section className="space-y-3">
        {monthlyInvoices.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center"><Receipt className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold">Chưa có hóa đơn tháng</p></div> : monthlyInvoices.map((invoice) => {
          const period = new Date(invoice.periodStart);
          const periodLabel = Number.isNaN(period.getTime()) ? 'chưa cập nhật kỳ' : `tháng ${period.getUTCMonth() + 1}/${period.getUTCFullYear()}`;
          return <article key={invoice.id} className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${invoice.isOverdue ? 'border-red-300 bg-red-50/40' : 'bg-white'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><p className="font-bold">Hóa đơn {periodLabel}</p><p className="mt-1 text-xs text-slate-500">Mã hóa đơn {invoice.id} · Hợp đồng {invoice.maHopDong}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : invoice.isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{invoice.status === 'PAID' ? 'Đã thanh toán' : invoice.isOverdue ? 'Quá hạn thanh toán' : 'Chờ thanh toán'}</span></div>
            <div className="divide-y">{(invoice.items || []).map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-medium">{item.type === 'DAMAGE_COMPENSATION' ? 'Đền bù tài sản hư hỏng' : item.type}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.description}</p>{item.ticket && <p className="mt-1 text-xs text-slate-400">Ticket {item.ticket.id} · {item.ticket.title}</p>}</div><p className="font-semibold text-rose-700">{money(item.amount)}</p></div>)}</div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div className="font-bold">Tổng hóa đơn: {money(invoice.totalAmount)}</div>{invoice.status === 'UNPAID' && <button type="button" onClick={() => startPayment('MONTHLY', invoice.id)} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"><QrCode className="h-4 w-4" />Thanh toán QR VNPAY</button>}</div>
          </article>;
        })}
      </section> : <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        {receiptCount === 0 ? <div className="py-6 text-center"><History className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold">Chưa có biên lai thanh toán</p></div> : <div className="divide-y">
          {vnpayPayments.filter((payment) => payment.status === 'PAID').map((payment) => <article key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><span className="rounded-full bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span><div><p className="font-semibold">Biên lai VNPAY · {payment.invoiceType === 'MONTHLY' ? 'Hóa đơn tháng' : 'Phí hợp đồng'}</p><p className="mt-1 text-xs text-slate-500">Hóa đơn {payment.invoiceId} · Sinh viên {payment.maSinhVien}</p><p className="text-xs text-slate-400">Mã giao dịch {payment.txnRef} · {formatDateTime(payment.paidAt)}</p></div></div><div className="text-right"><p className="font-bold">{money(payment.amount)}</p><p className="mt-1 text-xs text-slate-500">{payment.bankCode || 'VNPAY'} · Đã gạch nợ</p></div></article>)}
          {payments.filter((payment) => payment.phuongThuc !== 'VNPAY').map((payment) => <article key={payment.maHoaDon} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">Biên lai {payment.phuongThuc === 'COUNTER' ? 'thu tại quầy' : payment.phuongThuc}</p><p className="mt-1 text-xs text-slate-500">Hợp đồng {payment.maHopDong} · Sinh viên {payment.maSinhVien || '—'} · Phòng {payment.soPhong}</p><p className="text-xs text-slate-400">Mã biên lai {payment.maHoaDon} · {formatDateTime(payment.ngayThanhToan)}</p></div><p className="font-bold">{money(payment.soTien)}</p></article>)}
        </div>}
      </section>}
      <p className="text-center text-xs leading-5 text-slate-400">Cổng VNPAY hiển thị mã QR động sau khi mở giao dịch. Hóa đơn được gạch nợ khi VNPAY xác nhận thanh toán.</p>
    </div>
  </main>;
};

export default BillPayment;
