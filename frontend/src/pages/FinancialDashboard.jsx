import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Link from '../components/RoleLink';
import Sidebar from '../components/Sidebar';
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, BadgeCheck, Building2, Check,
  CircleDollarSign, Download, Droplets, FilePlus2, Filter, History, Loader2,
  Receipt, RefreshCw, Search, ShieldAlert, TrendingUp, WalletCards, Wrench, X, Zap
} from 'lucide-react';
import { paymentApi } from '../services/paymentApi';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const periodNow = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const periodLabel = (value) => {
  if (!value) return '—';
  const [year, month] = value.split('-');
  return `Tháng ${Number(month)}/${year}`;
};
const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const methodLabel = (value) => ({ CASH: 'Tiền mặt', COUNTER: 'Tại quầy', BANK_TRANSFER: 'Chuyển khoản', TRANSFER: 'Chuyển khoản', VNPAY: 'VNPAY' }[value] || value || 'Khác');
const transactionLabel = (value) => ({ COLLECTION: 'Thu phí', REFUND: 'Hoàn tiền', REPAIR_EXPENSE: 'Chi sửa chữa CSVC' }[value] || value);

const StatusPill = ({ status }) => {
  const styles = {
    UNPAID: 'bg-amber-50 text-amber-800 ring-amber-200',
    NO_CHARGE: 'bg-slate-100 text-slate-600 ring-slate-200',
    PAID: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    REFUNDED: 'bg-slate-100 text-slate-700 ring-slate-200',
    NEEDS_REVIEW: 'bg-rose-50 text-rose-800 ring-rose-200',
    CONFIRMED: 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  };
  const labels = { UNPAID: 'Chờ thu', NO_CHARGE: 'Không phát sinh', PAID: 'Đã thu', REFUNDED: 'Đã hoàn đủ', NEEDS_REVIEW: 'Cần xác minh', CONFIRMED: 'Đã xác minh' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{labels[status] || status}</span>;
};

const Modal = ({ title, description, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
  <section className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title">
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div><h2 id="finance-dialog-title" className="text-lg font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
      <button type="button" aria-label="Đóng" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
    </div>
    {children}
  </section>
</div>;

const FinancialDashboard = () => {
  const role = useSelector((state) => state.auth.user?.role);
  const canManage = ['ACCOUNTANT', 'TREASURER', 'ADMIN'].includes(role);
  const [period, setPeriod] = useState(periodNow);
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [repairTickets, setRepairTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('ALL');
  const [dialog, setDialog] = useState(null);
  const [rates, setRates] = useState({ electricityRate: '', waterRate: '' });

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [invoiceResponse, ledgerResponse, repairResponse] = await Promise.all([
        paymentApi.monthlyInvoices(period), paymentApi.ledger(period), paymentApi.repairTickets()
      ]);
      setInvoices(invoiceResponse.monthlyInvoices || []);
      setTransactions(ledgerResponse.transactions || []);
      setRepairTickets(repairResponse.tickets || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải sổ kế toán. Hãy thử làm mới sau ít phút.');
      throw requestError;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    let active = true;
    loadData().catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadData]);

  const runAction = async (action) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(result?.message || 'Đã lưu thay đổi.');
      setDialog(null);
      await loadData(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể hoàn thành thao tác.');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const confirmed = transactions.filter((row) => row.status === 'CONFIRMED');
    const collected = confirmed.filter((row) => row.transactionType === 'COLLECTION').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const refunded = confirmed.filter((row) => row.transactionType === 'REFUND').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const repairCost = confirmed.filter((row) => row.transactionType === 'REPAIR_EXPENSE').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const unpaid = invoices.filter((invoice) => invoice.status === 'UNPAID').reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const reviewCount = transactions.filter((row) => row.status === 'NEEDS_REVIEW').length;
    return { collected, refunded, repairCost, unpaid, reviewCount, net: collected - refunded - repairCost };
  }, [invoices, transactions]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return invoices;
    return invoices.filter((invoice) => [
      invoice.id, invoice.maSinhVien, invoice.sinhVien?.hoTen,
      invoice.hopDong?.phong?.soPhong, invoice.hopDong?.phong?.maToaNha,
      invoice.hopDong?.phong?.toaNha?.tenToaNha
    ].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query)));
  }, [invoices, search]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return transactions.filter((row) => {
      const typeMatches = transactionFilter === 'ALL' || (transactionFilter === 'NEEDS_REVIEW' ? row.status === 'NEEDS_REVIEW' : row.transactionType === transactionFilter);
      const queryMatches = !query || [row.id, row.invoiceId, row.maSinhVien, row.sinhVien?.hoTen,
        row.bankReference, row.description, row.ticket?.title, row.toaNha?.tenToaNha]
        .some((value) => String(value || '').toLocaleLowerCase('vi').includes(query));
      return typeMatches && queryMatches;
    });
  }, [transactions, transactionFilter, search]);

  const generateInvoices = (event) => {
    event.preventDefault();
    runAction(() => paymentApi.generateMonthlyInvoices({
      period,
      electricityRate: Number(rates.electricityRate),
      waterRate: Number(rates.waterRate)
    }));
  };

  const exportLedger = () => {
    const columns = ['Ngày giờ', 'Loại', 'Mã hóa đơn / phiếu', 'Sinh viên', 'Tòa nhà', 'Số tiền', 'Phương thức', 'Mã tham chiếu', 'Trạng thái', 'Nội dung'];
    const rows = filteredTransactions.map((row) => [
      dateTime(row.createdAt), transactionLabel(row.transactionType), row.invoiceId || row.ticket?.id || row.id,
      row.sinhVien?.hoTen || row.maSinhVien || '', row.toaNha?.tenToaNha || row.maToaNha || '', row.amount,
      methodLabel(row.method), row.bankReference || '', row.status === 'NEEDS_REVIEW' ? 'Cần xác minh' : 'Đã xác minh', row.description || ''
    ]);
    const csv = [columns, ...rows].map((cells) => cells.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `so-thu-chi-${period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'invoices', label: 'Hóa đơn tháng', Icon: Receipt },
    { id: 'transactions', label: 'Giao dịch', Icon: History, count: totals.reviewCount },
    { id: 'reconciliation', label: 'Đối soát thu chi', Icon: WalletCards }
  ];

  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 text-slate-800">
    <Sidebar />
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm sm:px-8">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Tài chính KTX</p><h1 className="text-lg font-semibold sm:text-xl">Thu phí & đối soát</h1></div>
        <button type="button" onClick={() => loadData().catch(() => {})} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="hidden sm:inline">Làm mới</span>
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:px-6">
            <div><div className="flex items-center gap-2 text-sm font-semibold text-blue-800"><Building2 className="h-4 w-4" />Sổ kế toán và thủ quỹ</div><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{periodLabel(period)}</h2><p className="mt-1 text-sm text-slate-500">Theo dõi hóa đơn điện nước, khoản thu, hoàn tiền và chi phí sửa chữa.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Kỳ đối soát<input type="month" value={period} onChange={(event) => { if (event.target.value) setPeriod(event.target.value); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800" /></label>
              {role === 'ACCOUNTANT' || role === 'ADMIN' ? <Link to="/meter-readings" className="inline-flex items-center gap-2 self-end rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Zap className="h-4 w-4 text-amber-500" />Sổ chỉ số</Link> : null}
            </div>
          </section>

          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Đã thu trong kỳ" value={money(totals.collected)} detail="Giao dịch đã xác minh" color="emerald" Icon={ArrowDownLeft} />
            <SummaryCard label="Hoàn tiền" value={money(totals.refunded)} detail="Khoản hoàn đã xác minh" color="amber" Icon={ArrowUpRight} />
            <SummaryCard label="Chi sửa chữa CSVC" value={money(totals.repairCost)} detail="Phiếu sửa chữa đã thanh toán" color="blue" Icon={Wrench} />
            <SummaryCard label="Cần xác minh" value={String(totals.reviewCount)} detail="Giao dịch chờ đối chiếu" color={totals.reviewCount ? 'rose' : 'slate'} Icon={ShieldAlert} onClick={() => { setActiveTab('transactions'); setTransactionFilter('NEEDS_REVIEW'); }} />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
            <div role="tablist" aria-label="Các mục tài chính" className="flex flex-wrap gap-1">
              {tabs.map(({ id, label, Icon, count }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${activeTab === id ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <Icon className="h-4 w-4" />{label}{count > 0 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">{count}</span>}
              </button>)}
            </div>
            {activeTab !== 'reconciliation' && <label className="relative mb-1 w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={activeTab === 'invoices' ? 'Tìm mã hóa đơn, sinh viên, phòng…' : 'Tìm mã giao dịch, hóa đơn…'} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>}
          </div>

          {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-700" />Đang tải sổ tài chính…</div> : activeTab === 'invoices' ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div><h3 className="font-bold text-slate-900">Hóa đơn điện, nước và khoản phát sinh</h3><p className="mt-1 text-xs text-slate-500">Chỉ số do nhân viên quản lý CSVC ghi nhận; tiền điện nước được chia theo số người có hợp đồng tại phòng.</p></div>
              {canManage && <button type="button" onClick={() => setDialog({ type: 'generate' })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800"><FilePlus2 className="h-4 w-4" />Lập hóa đơn từ chỉ số</button>}
            </div>
            {invoices.length === 0 ? <EmptyState title="Chưa có hóa đơn trong kỳ" detail="Ghi đủ chỉ số điện và nước cho các phòng, sau đó lập hóa đơn từ chỉ số." /> : filteredInvoices.length === 0 ? <EmptyState title="Không tìm thấy hóa đơn" detail="Thử từ khóa khác hoặc xóa nội dung tìm kiếm." /> : <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Sinh viên / phòng</th><th className="px-4 py-3">Chi tiết kỳ này</th><th className="px-4 py-3 text-right">Tổng tiền</th><th className="px-4 py-3 text-right">Đã hoàn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((invoice) => {
                    const room = invoice.hopDong?.phong;
                    const electricity = (invoice.items || []).find((item) => item.type === 'ELECTRICITY');
                    const water = (invoice.items || []).find((item) => item.type === 'WATER');
                    const repair = (invoice.items || []).filter((item) => item.type === 'DAMAGE_COMPENSATION').reduce((sum, item) => sum + Number(item.amount || 0), 0);
                    const refundable = Math.max(Number(invoice.collectedAmount || 0) - Number(invoice.refundedAmount || 0) - Number(invoice.pendingRefundAmount || 0), 0);
                    return <tr key={invoice.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4"><p className="font-bold text-slate-900">{invoice.sinhVien?.hoTen || invoice.maSinhVien}</p><p className="mt-0.5 text-xs text-slate-500">{invoice.maSinhVien} · {room?.tenToaNha || room?.maToaNha || 'Tòa nhà'} · Phòng {room?.soPhong || invoice.hopDong?.maPhong}</p><p className="mt-1 font-mono text-[11px] text-slate-400">{invoice.id}</p></td>
                      <td className="px-4 py-4"><div className="space-y-1.5 text-xs">
                        <p className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-slate-600"><Zap className="h-3.5 w-3.5 text-amber-500" />Điện</span><strong className="text-slate-800">{electricity ? money(electricity.amount) : '—'}</strong></p>
                        <p className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-slate-600"><Droplets className="h-3.5 w-3.5 text-sky-600" />Nước</span><strong className="text-slate-800">{water ? money(water.amount) : '—'}</strong></p>
                        {repair > 0 && <p className="flex items-center justify-between gap-4"><span className="text-slate-600">Đền bù CSVC</span><strong className="text-rose-700">{money(repair)}</strong></p>}
                        <details className="pt-1 text-xs text-blue-700"><summary className="cursor-pointer font-semibold">Xem căn cứ / khoản phí</summary><div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-2.5">{(invoice.items || []).map((item) => <div key={item.id}><p className="font-semibold text-slate-700">{item.type} · {money(item.amount)}</p><p className="mt-0.5 whitespace-pre-wrap text-slate-500">{item.description}</p></div>)}</div></details>
                      </div></td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-mono font-bold text-slate-950">{money(invoice.totalAmount)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-slate-700">{money(invoice.refundedAmount)}{invoice.pendingRefundAmount > 0 && <p className="mt-1 font-sans text-[11px] text-amber-700">+ {money(invoice.pendingRefundAmount)} chờ xác minh</p>}</td>
                      <td className="px-4 py-4"><StatusPill status={invoice.status} />{invoice.status === 'PAID' && <p className="mt-1 text-[11px] text-slate-400">Đã thu {money(invoice.collectedAmount)}</p>}</td>
                      <td className="px-4 py-4"><div className="flex justify-end gap-2">
                        {canManage && invoice.status === 'UNPAID' && <button type="button" onClick={() => setDialog({ type: 'collect', invoice })} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Ghi nhận thu</button>}
                        {canManage && refundable > 0 && <button type="button" onClick={() => setDialog({ type: 'refund', invoice, refundable })} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100">Hoàn tiền</button>}
                      </div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Hiển thị {filteredInvoices.length} / {invoices.length} hóa đơn trong {periodLabel(period)}.</div>
            </div>}
          </section> : activeTab === 'transactions' ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><h3 className="font-bold text-slate-900">Sổ giao dịch</h3><p className="mt-1 text-xs text-slate-500">Các giao dịch trùng mã tham chiếu hoặc thiếu căn cứ chuyển khoản được đưa vào danh sách cần xác minh.</p></div><div className="flex gap-2"><label className="sr-only" htmlFor="transaction-filter">Lọc giao dịch</label><span className="inline-flex items-center rounded-lg border border-slate-200 px-2 text-slate-400"><Filter className="h-4 w-4" /></span><select id="transaction-filter" value={transactionFilter} onChange={(event) => setTransactionFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="ALL">Tất cả giao dịch</option><option value="NEEDS_REVIEW">Cần xác minh</option><option value="COLLECTION">Thu phí</option><option value="REFUND">Hoàn tiền</option><option value="REPAIR_EXPENSE">Chi sửa chữa</option></select></div></div>
            {filteredTransactions.length === 0 ? <EmptyState title="Không có giao dịch phù hợp" detail="Chưa có giao dịch trong kỳ hoặc bộ lọc hiện tại không có kết quả." /> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Ngày giờ</th><th className="px-4 py-3">Loại giao dịch</th><th className="px-4 py-3">Hóa đơn / căn cứ</th><th className="px-4 py-3">Phương thức</th><th className="px-4 py-3 text-right">Số tiền</th><th className="px-4 py-3">Kiểm tra</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredTransactions.map((row) => <tr key={row.id} className={`align-top hover:bg-slate-50/70 ${row.status === 'NEEDS_REVIEW' ? 'bg-rose-50/30' : ''}`}>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{dateTime(row.createdAt)}</td>
                <td className="px-4 py-4"><p className="font-semibold text-slate-800">{transactionLabel(row.transactionType)}</p><p className="mt-1 text-xs text-slate-500">{row.sinhVien?.hoTen || row.maSinhVien || row.ticket?.title || '—'}</p></td>
                <td className="max-w-xs px-4 py-4"><p className="font-mono text-xs font-semibold text-slate-700">{row.invoiceId || row.ticket?.id || '—'}</p><p className="mt-1 break-all text-xs text-slate-500">{row.bankReference ? `Tham chiếu: ${row.bankReference}` : row.description || 'Không có mã tham chiếu'}</p>{row.ticket?.title && <p className="mt-1 text-xs text-slate-500">{row.ticket.title}</p>}</td>
                <td className="px-4 py-4 text-xs text-slate-600">{methodLabel(row.method)}</td>
                <td className={`whitespace-nowrap px-4 py-4 text-right font-mono font-bold ${row.transactionType === 'COLLECTION' ? 'text-emerald-700' : row.transactionType === 'REFUND' ? 'text-amber-700' : 'text-slate-800'}`}>{row.transactionType === 'COLLECTION' ? '+' : '−'}{money(row.amount)}</td>
                <td className="px-4 py-4"><StatusPill status={row.status} />{row.reviewNote && <p className="mt-1 max-w-[190px] text-xs text-slate-500">{row.reviewNote}</p>}</td>
                <td className="px-4 py-4 text-right">{canManage && row.status === 'NEEDS_REVIEW' && <button type="button" onClick={() => setDialog({ type: 'review', transaction: row })} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800"><Check className="h-3.5 w-3.5" />Xác minh</button>}</td>
              </tr>)}</tbody>
            </table><div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Hiển thị {filteredTransactions.length} giao dịch.</div></div>}
          </section> : <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Doanh thu đã thu" value={money(totals.collected)} detail="Tiền vào đã xác minh" color="emerald" Icon={TrendingUp} />
              <SummaryCard label="Khoản hoàn" value={money(totals.refunded)} detail="Tiền hoàn đã ghi sổ" color="amber" Icon={ArrowUpRight} />
              <SummaryCard label="Tiền sửa chữa CSVC" value={money(totals.repairCost)} detail="Chi phí các ticket hoàn tất" color="blue" Icon={Wrench} />
              <SummaryCard label="Thu chi ròng" value={money(totals.net)} detail="Doanh thu − hoàn tiền − sửa chữa" color={totals.net >= 0 ? 'slate' : 'rose'} Icon={CircleDollarSign} />
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><h3 className="font-bold text-slate-900">Đối soát doanh thu và chi phí sửa chữa</h3><p className="mt-1 text-xs text-slate-500">Gộp khoản thu, hoàn tiền và chi phí khắc phục CSVC trong cùng kỳ.</p></div><div className="flex gap-2">{canManage && <button type="button" onClick={() => setDialog({ type: 'expense' })} disabled={!repairTickets.length} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"><Wrench className="h-4 w-4" />Ghi chi phí sửa chữa</button>}<button type="button" onClick={exportLedger} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Xuất CSV</button></div></div>
              <div className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thu đã xác minh</p><p className="mt-2 text-xl font-black text-emerald-700">{money(totals.collected)}</p></div><div className="p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoàn tiền đã xác minh</p><p className="mt-2 text-xl font-black text-amber-700">−{money(totals.refunded)}</p></div><div className="p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sửa chữa đã xác minh</p><p className="mt-2 text-xl font-black text-slate-800">−{money(totals.repairCost)}</p></div></div>
              {repairTickets.length > 0 && <div className="border-t border-slate-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-900"><Wrench className="mr-2 inline h-4 w-4" />Còn {repairTickets.length} phiếu sửa chữa hoàn tất chưa ghi nhận chi phí.</div>}
              {totals.reviewCount > 0 && <button type="button" onClick={() => { setActiveTab('transactions'); setTransactionFilter('NEEDS_REVIEW'); }} className="w-full border-t border-rose-100 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-800 hover:bg-rose-100"><ShieldAlert className="mr-2 inline h-4 w-4" />{totals.reviewCount} giao dịch đang chờ xác minh. Mở danh sách giao dịch →</button>}
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h3 className="font-bold text-slate-900">Dòng tiền trong kỳ</h3><p className="mt-1 text-xs text-slate-500">{periodLabel(period)} · {transactions.length} giao dịch</p></div><button type="button" onClick={exportLedger} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />CSV</button></div>
              {transactions.length === 0 ? <EmptyState title="Chưa có giao dịch trong kỳ" detail="Khoản thu và chi sẽ xuất hiện tại đây sau khi được ghi nhận." /> : <div className="divide-y divide-slate-100">{transactions.slice(0, 12).map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className={`rounded-xl p-2 ${row.transactionType === 'COLLECTION' ? 'bg-emerald-50 text-emerald-700' : row.transactionType === 'REFUND' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{row.transactionType === 'COLLECTION' ? <ArrowDownLeft className="h-4 w-4" /> : row.transactionType === 'REFUND' ? <ArrowUpRight className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{transactionLabel(row.transactionType)} · {row.sinhVien?.hoTen || row.ticket?.title || row.invoiceId || row.id}</p><p className="mt-0.5 truncate text-xs text-slate-500">{dateTime(row.createdAt)} · {methodLabel(row.method)} · {row.toaNha?.tenToaNha || row.maToaNha || '—'}</p></div></div><div className="flex items-center gap-3"><StatusPill status={row.status} /><p className={`whitespace-nowrap font-mono text-sm font-bold ${row.transactionType === 'COLLECTION' ? 'text-emerald-700' : 'text-slate-800'}`}>{row.transactionType === 'COLLECTION' ? '+' : '−'}{money(row.amount)}</p></div></div>)}</div>}
            </section>
          </div>}
        </div>
      </main>
    </div>

    {dialog?.type === 'generate' && <Modal title="Lập hóa đơn điện nước" description={`Tạo hóa đơn ${periodLabel(period)} từ chỉ số đã ghi cho từng phòng.`} onClose={() => !saving && setDialog(null)}>
      <form onSubmit={generateInvoices} className="space-y-4 px-5 py-5 sm:px-6">
        <label className="block text-sm font-semibold text-slate-700">Kỳ hóa đơn<input type="month" required value={period} onChange={(event) => { if (event.target.value) setPeriod(event.target.value); }} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Đơn giá điện (đ/kWh)<input type="number" min="1" max="1000000" required value={rates.electricityRate} onChange={(event) => setRates((current) => ({ ...current, electricityRate: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold text-slate-700">Đơn giá nước (đ/m³)<input type="number" min="1" max="1000000" required value={rates.waterRate} onChange={(event) => setRates((current) => ({ ...current, waterRate: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label></div>
        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">Nhập đơn giá đã được phê duyệt cho kỳ này. Mỗi phòng cần đủ chỉ số điện và nước; chi phí phòng có nhiều sinh viên được chia đều theo hợp đồng đang hoạt động. Hóa đơn đã thu sẽ không bị thay đổi.</p>
        <ModalActions saving={saving} submitLabel="Lập hóa đơn" onCancel={() => setDialog(null)} />
      </form>
    </Modal>}

    {dialog?.type === 'collect' && <Modal title="Ghi nhận thu phí" description={`${dialog.invoice.sinhVien?.hoTen || dialog.invoice.maSinhVien} · ${money(dialog.invoice.totalAmount)}`} onClose={() => !saving && setDialog(null)}>
      <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); runAction(() => paymentApi.collectMonthlyInvoice(dialog.invoice.id, Object.fromEntries(data.entries()))); }} className="space-y-4 px-5 py-5 sm:px-6">
        <label className="block text-sm font-semibold text-slate-700">Phương thức<select name="method" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option></select></label>
        <label className="block text-sm font-semibold text-slate-700">Mã tham chiếu ngân hàng <span className="font-normal text-slate-400">(bắt buộc nếu chuyển khoản)</span><input name="bankReference" maxLength="100" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Mã giao dịch trên sao kê" /></label>
        <label className="block text-sm font-semibold text-slate-700">Ghi chú<input name="description" maxLength="1000" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Ví dụ: Thu tại quầy, biên lai số…" /></label>
        <ModalActions saving={saving} submitLabel="Xác nhận đã thu" onCancel={() => setDialog(null)} />
      </form>
    </Modal>}

    {dialog?.type === 'refund' && <Modal title="Ghi nhận hoàn tiền" description={`${dialog.invoice.sinhVien?.hoTen || dialog.invoice.maSinhVien} · còn có thể hoàn ${money(dialog.refundable)}`} onClose={() => !saving && setDialog(null)}>
      <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); runAction(() => paymentApi.refundMonthlyInvoice(dialog.invoice.id, Object.fromEntries(data.entries()))); }} className="space-y-4 px-5 py-5 sm:px-6">
        <label className="block text-sm font-semibold text-slate-700">Số tiền hoàn (₫)<input name="amount" type="number" required min="1" max={dialog.refundable} defaultValue={dialog.refundable} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold text-slate-700">Lý do hoàn<input name="reason" required minLength="5" maxLength="1000" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Ghi rõ căn cứ và lý do hoàn tiền" /></label>
        <label className="block text-sm font-semibold text-slate-700">Phương thức hoàn<select name="method" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option></select></label>
        <label className="block text-sm font-semibold text-slate-700">Mã tham chiếu ngân hàng <span className="font-normal text-slate-400">(bắt buộc nếu chuyển khoản)</span><input name="bankReference" maxLength="100" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Mã giao dịch hoàn trên sao kê" /></label>
        <ModalActions saving={saving} submitLabel="Lưu khoản hoàn" onCancel={() => setDialog(null)} />
      </form>
    </Modal>}

    {dialog?.type === 'expense' && <Modal title="Ghi chi phí sửa chữa CSVC" description="Chọn phiếu sửa chữa đã hoàn tất để đưa khoản chi vào đối soát." onClose={() => !saving && setDialog(null)}>
      <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); runAction(() => paymentApi.recordRepairExpense(Object.fromEntries(data.entries()))); }} className="space-y-4 px-5 py-5 sm:px-6">
        <label className="block text-sm font-semibold text-slate-700">Phiếu sửa chữa<select name="ticketId" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"><option value="" disabled>Chọn phiếu đã hoàn tất</option>{repairTickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.title} · Phòng {ticket.phong?.soPhong} · {ticket.phong?.tenToaNha || ticket.phong?.maToaNha}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-700">Chi phí thực tế (₫)<input name="amount" type="number" required min="1" max="2147483647" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Nhập số tiền đã chi" /></label>
        <label className="block text-sm font-semibold text-slate-700">Phương thức<select name="method" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt</option></select></label>
        <label className="block text-sm font-semibold text-slate-700">Mã tham chiếu ngân hàng <span className="font-normal text-slate-400">(bắt buộc nếu chuyển khoản)</span><input name="bankReference" maxLength="100" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Mã giao dịch trên sao kê" /></label>
        <label className="block text-sm font-semibold text-slate-700">Nội dung chi<input name="description" maxLength="1000" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Nhà cung cấp, vật tư hoặc ghi chú" /></label>
        <ModalActions saving={saving} submitLabel="Ghi sổ chi phí" onCancel={() => setDialog(null)} />
      </form>
    </Modal>}

    {dialog?.type === 'review' && <Modal title="Xác minh giao dịch" description={`${transactionLabel(dialog.transaction.transactionType)} · ${money(dialog.transaction.amount)} · ${dialog.transaction.bankReference || 'Thiếu mã tham chiếu'}`} onClose={() => !saving && setDialog(null)}>
      <form onSubmit={(event) => { event.preventDefault(); const note = new FormData(event.currentTarget).get('note'); runAction(() => paymentApi.reviewTransaction(dialog.transaction.id, note)); }} className="space-y-4 px-5 py-5 sm:px-6">
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">Đối chiếu khoản tiền với sao kê/biên lai trước khi xác nhận. Giao dịch đã xác minh sẽ được tính vào tổng thu chi.</div>
        <label className="block text-sm font-semibold text-slate-700">Kết quả xác minh<textarea name="note" required minLength="5" maxLength="500" rows="3" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Ghi rõ căn cứ đối chiếu và kết quả" /></label>
        <ModalActions saving={saving} submitLabel="Đã đối chiếu" onCancel={() => setDialog(null)} />
      </form>
    </Modal>}
  </div>;
};

const SummaryCard = ({ label, value, detail, color, Icon, onClick }) => {
  const colors = { emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', rose: 'bg-rose-50 text-rose-700', slate: 'bg-slate-100 text-slate-700' };
  const Tag = onClick ? 'button' : 'div';
  return <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:p-5 ${onClick ? 'transition hover:border-rose-300 hover:shadow' : ''}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className={`rounded-xl p-2.5 ${colors[color] || colors.slate}`}><Icon className="h-5 w-5" /></span></div>
  </Tag>;
};

const EmptyState = ({ title, detail }) => <div className="px-5 py-12 text-center"><Receipt className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{detail}</p></div>;

const ModalActions = ({ saving, submitLabel, onCancel }) => <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Hủy</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</button></div>;

export default FinancialDashboard;
