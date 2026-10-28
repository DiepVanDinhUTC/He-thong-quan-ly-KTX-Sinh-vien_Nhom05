/* eslint-disable react/prop-types */
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BarChart3, BedDouble, Clock3, Loader2, RefreshCw, Receipt, Wallet, Wrench } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useBoardWorkspace } from '../components/BoardLayout';
import { dashboardApi } from '../services/dashboardApi';

const DashboardCharts = lazy(() => import('../components/DashboardCharts'));
const number = (value) => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const money = (value) => `${number(value)} đ`;

const Stat = ({ label, value, description, Icon, color }) => <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`rounded-lg p-2 ${color}`}><Icon className="h-5 w-5" /></span></div>
  <p className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
</section>;

const DashboardOverview = () => {
  const isBoardWorkspace = useBoardWorkspace();
  const [months, setMonths] = useState('6');
  const [buildingId, setBuildingId] = useState('');
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    dashboardApi.overview({ months, maToaNha: buildingId, signal: controller.signal }).then((response) => {
      if (active) setData(response);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Không thể tải thống kê. Vui lòng thử lại.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [months, buildingId, revision]);

  const PageHeading = isBoardWorkspace ? 'h2' : 'h1';
  const summary = data?.summary;
  const body = <div className="mx-auto w-full max-w-[1600px] space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><PageHeading className="flex items-center gap-2 text-xl font-bold text-slate-900"><BarChart3 className="h-6 w-6 text-blue-700" />Thống kê hoạt động KTX</PageHeading><p className="mt-2 text-sm text-slate-500">Theo dõi phòng ở, doanh thu, công nợ và chất lượng xử lý sự cố từ dữ liệu hệ thống.</p></div>
      <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button>
    </div>

    <section aria-label="Bộ lọc thống kê" className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="min-w-44 text-xs font-semibold text-slate-600">Khoảng thời gian<select value={months} onChange={(event) => setMonths(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"><option value="3">3 tháng gần nhất</option><option value="6">6 tháng gần nhất</option><option value="12">12 tháng gần nhất</option></select></label>
      <label className="min-w-52 text-xs font-semibold text-slate-600">Tòa nhà<select value={buildingId} onChange={(event) => setBuildingId(event.target.value)} disabled={!data} className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 disabled:bg-slate-50"><option value="">{data?.scope.mode === 'assigned' ? 'Tất cả tòa được phân công' : 'Toàn KTX'}</option>{data?.buildings.map((building) => <option key={building.maToaNha} value={building.maToaNha}>{building.tenToaNha} · {building.maToaNha}</option>)}</select></label>
      <p className="max-w-xl pb-1 text-xs leading-5 text-slate-500">Khoảng thời gian gồm tháng hiện tại. Tỷ lệ lấp đầy và công nợ phản ánh hiện trạng tại lần tải gần nhất.</p>
    </section>

    {loading ? <div role="status" className="flex min-h-72 items-center justify-center gap-3 rounded-2xl border bg-white p-8 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-700" />Đang tổng hợp dữ liệu thống kê…</div> : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"><p>{error}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-3 font-semibold underline underline-offset-2">Tải lại thống kê</button></div> : data && <>
      {data.scope.mode === 'assigned' && data.buildings.length === 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Tài khoản chưa được phân công tòa nhà. Liên hệ người quản lý tài khoản để được gán phạm vi thống kê.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <Stat label="Tỷ lệ lấp đầy" value={`${number(summary.occupancyRate)}%`} description={`${number(summary.occupied)} / ${number(summary.capacity)} chỗ · ${number(summary.roomCount)} phòng`} Icon={BedDouble} color="bg-blue-50 text-blue-700" />
        <Stat label="Doanh thu ròng trong kỳ" value={money(summary.netRevenue)} description={`Đã thu ${money(summary.collected)} · Hoàn ${money(summary.refunds)}`} Icon={Wallet} color="bg-emerald-50 text-emerald-700" />
        <Stat label="Công nợ hiện tại" value={money(summary.debt)} description={`${number(summary.unpaidInvoiceCount)} khoản chưa thu · Quá hạn ${money(summary.overdueDebt)}`} Icon={Receipt} color="bg-rose-50 text-rose-700" />
        <Stat label="Xử lý sự cố trung bình" value={summary.averageResolutionHours == null ? 'Chưa có dữ liệu' : `${number(summary.averageResolutionHours)} giờ`} description={`${number(summary.resolvedCount)} sự cố hoàn tất trong kỳ`} Icon={Clock3} color="bg-violet-50 text-violet-700" />
        <Stat label="Tần suất báo hỏng" value={`${number(summary.reportsPerMonth)} đơn/tháng`} description={`${number(summary.reportCount)} yêu cầu trong ${data.period.months} tháng`} Icon={Wrench} color="bg-amber-50 text-amber-700" />
      </div>
      <Suspense fallback={<p role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải biểu đồ…</p>}><DashboardCharts charts={data.charts} summary={summary} /></Suspense>
      <p className="text-right text-xs text-slate-500">Cập nhật {new Date(data.generatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · Chỉ hiển thị số liệu tổng hợp theo quyền của tài khoản.</p>
    </>}
  </div>;

  if (isBoardWorkspace) return body;
  return <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 text-slate-800"><Sidebar /><main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-8">{body}</main></div>;
};

export default DashboardOverview;
