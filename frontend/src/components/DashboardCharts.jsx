/* eslint-disable react/prop-types */
import React from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';

const number = (value) => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const money = (value) => `${number(value)} đ`;
const compactMoney = (value) => Number(value).toLocaleString('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const chartMargin = { top: 12, right: 20, left: 4, bottom: 8 };
const categories = [
  { key: 'electricity', label: 'Điện', color: '#2563eb' },
  { key: 'water', label: 'Nước', color: '#0891b2' },
  { key: 'airConditioning', label: 'Điều hòa', color: '#7c3aed' },
  { key: 'furniture', label: 'Nội thất', color: '#d97706' },
  { key: 'other', label: 'Khác', color: '#64748b' },
];

const DataTable = ({ rows, columns }) => <details className="mt-3 border-t border-slate-100 pt-3 text-sm">
  <summary className="w-fit cursor-pointer font-medium text-blue-700 focus-visible:outline-blue-500">Xem bảng số liệu</summary>
  <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{columns.map(({ key, label }) => <th key={key} scope="col" className="whitespace-nowrap border-b px-3 py-2 font-semibold text-slate-600">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.period || row.buildingId || index}>{columns.map(({ key, format }) => <td key={key} className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700">{row[key] == null ? 'Chưa có dữ liệu' : format ? format(row[key]) : row[key]}</td>)}</tr>)}</tbody></table></div>
</details>;

const ChartPanel = ({ title, description, empty, emptyMessage, children, rows, columns, wide = false }) => <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${wide ? 'xl:col-span-2' : ''}`}>
  <h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{description}</p>
  {empty ? <div className="flex h-72 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500"><BarChart3 className="h-8 w-8 text-slate-300" /><p>{emptyMessage}</p></div> : <div className="mt-3 h-72 min-w-0">{children}</div>}
  {!empty && <DataTable rows={rows} columns={columns} />}
</section>;

const DashboardCharts = ({ charts, summary }) => <div className="grid min-w-0 gap-5 xl:grid-cols-2">
  <ChartPanel title="Tỷ lệ lấp đầy phòng" description="Hiện tại · số chỗ đã xếp hoặc giữ chỗ / tổng sức chứa, theo từng tòa nhà." rows={charts.occupancy} columns={[{ key: 'name', label: 'Tòa nhà' }, { key: 'roomCount', label: 'Số phòng' }, { key: 'occupied', label: 'Chỗ đã xếp / giữ' }, { key: 'capacity', label: 'Sức chứa' }, { key: 'rate', label: 'Tỷ lệ', format: (value) => `${number(value)}%` }]} empty={!charts.occupancy.length} emptyMessage="Chưa có phòng trong phạm vi thống kê.">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={charts.occupancy} margin={chartMargin} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={(value) => `${number(value)}%`} labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label} /><Bar dataKey="rate" name="Tỷ lệ lấp đầy" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={52} />
      </BarChart>
    </ResponsiveContainer>
  </ChartPanel>

  <ChartPanel title="Doanh thu hóa đơn" description="Tiền thu đã xác nhận từ hợp đồng và hóa đơn tháng; doanh thu ròng đã trừ hoàn tiền. Đơn vị: đồng." rows={charts.revenue} columns={[{ key: 'label', label: 'Tháng' }, { key: 'contractRevenue', label: 'Thu hợp đồng', format: money }, { key: 'monthlyRevenue', label: 'Thu hóa đơn tháng', format: money }, { key: 'refunds', label: 'Hoàn tiền', format: money }, { key: 'netRevenue', label: 'Doanh thu ròng', format: money }]} empty={summary.collected === 0 && summary.refunds === 0} emptyMessage="Chưa có khoản thu hoặc hoàn tiền trong thời gian đã chọn.">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart data={charts.revenue} margin={chartMargin} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={20} /><YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={62} /><Tooltip formatter={money} /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="contractRevenue" name="Thu hợp đồng" stackId="collected" fill="#2563eb" maxBarSize={38} /><Bar dataKey="monthlyRevenue" name="Thu hóa đơn tháng" stackId="collected" fill="#06b6d4" maxBarSize={38} /><Bar dataKey="refunds" name="Hoàn tiền" fill="#f59e0b" maxBarSize={38} /><Line type="monotone" dataKey="netRevenue" name="Doanh thu ròng" stroke="#059669" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  </ChartPanel>

  <ChartPanel title="Công nợ chưa thanh toán" description="Hiện tại · phí hợp đồng chờ thanh toán và hóa đơn tháng chưa thu, tách phần quá hạn. Đơn vị: đồng." rows={charts.debt} columns={[{ key: 'name', label: 'Tòa nhà' }, { key: 'pending', label: 'Chưa đến hạn', format: money }, { key: 'overdue', label: 'Quá hạn', format: money }, { key: 'total', label: 'Tổng công nợ', format: money }, { key: 'invoiceCount', label: 'Số khoản chưa thu' }]} empty={!charts.debt.length} emptyMessage="Không có công nợ chưa thanh toán trong phạm vi này.">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={charts.debt} margin={chartMargin} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={62} /><Tooltip formatter={money} labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="pending" name="Chưa đến hạn" stackId="debt" fill="#f59e0b" maxBarSize={52} /><Bar dataKey="overdue" name="Quá hạn" stackId="debt" fill="#e11d48" maxBarSize={52} />
      </BarChart>
    </ResponsiveContainer>
  </ChartPanel>

  <ChartPanel title="Thời gian xử lý sự cố trung bình" description="Từ lúc báo hỏng đến khi kỹ thuật hoàn tất, theo tháng hoàn tất; không cộng thời gian chờ nghiệm thu. Đơn vị: giờ." rows={charts.resolution} columns={[{ key: 'label', label: 'Tháng hoàn tất' }, { key: 'resolvedCount', label: 'Số sự cố đã xử lý' }, { key: 'averageHours', label: 'Thời gian trung bình', format: (value) => `${number(value)} giờ` }]} empty={summary.resolvedCount === 0} emptyMessage="Chưa có sự cố hoàn tất để tính thời gian xử lý.">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={charts.resolution} margin={chartMargin} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={20} /><YAxis tick={{ fontSize: 11 }} width={48} /><Tooltip formatter={(value) => `${number(value)} giờ`} /><Line type="monotone" dataKey="averageHours" name="Thời gian trung bình" stroke="#7c3aed" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  </ChartPanel>

  <ChartPanel wide title="Tần suất báo hỏng CSVC" description="Số yêu cầu báo hỏng theo tháng gửi và nhóm thiết bị; không tính yêu cầu bị từ chối." rows={charts.failures} columns={[{ key: 'label', label: 'Tháng' }, ...categories.map(({ key, label }) => ({ key, label })), { key: 'count', label: 'Tổng yêu cầu' }]} empty={summary.reportCount === 0} emptyMessage="Chưa có yêu cầu báo hỏng trong thời gian đã chọn.">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={charts.failures} margin={chartMargin} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={20} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={44} /><Tooltip formatter={(value) => `${number(value)} yêu cầu`} /><Legend wrapperStyle={{ fontSize: 12 }} />
        {categories.map(({ key, label, color }) => <Bar key={key} dataKey={key} name={label} stackId="reports" fill={color} maxBarSize={56} />)}
      </BarChart>
    </ResponsiveContainer>
  </ChartPanel>
</div>;

export default DashboardCharts;
