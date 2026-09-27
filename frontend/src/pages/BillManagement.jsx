import React from 'react';
import { 
  Search, Bell, LayoutDashboard, Users, 
  BedDouble, CreditCard, Settings, Download, 
  Zap, FilePlus, Eye, Edit, BellRing, Filter,
  TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react';

// --- MOCK DATA ---
const BILLS = [
  { id: 'HD-0926-001', room: 'A1-417', representative: '231133215', roomFee: '480.000', utilityFee: '731.538', penaltyFee: '0', total: '1.211.538', status: 'Chờ thanh toán' },
  { id: 'HD-0926-002', room: 'A4-311', representative: '211611495', roomFee: '450.000', utilityFee: '652.878', penaltyFee: '0', total: '1.102.878', status: 'Đã thanh toán' },
  { id: 'HD-0826-105', room: 'A6-503', representative: '234131902', roomFee: '480.000', utilityFee: '812.820', penaltyFee: '150.000', total: '1.442.820', status: 'Nợ quá hạn' },
  { id: 'HD-0926-003', room: 'A4-406', representative: '211302017', roomFee: '450.000', utilityFee: '1.206.120', penaltyFee: '0', total: '1.656.120', status: 'Chờ thanh toán' },
  { id: 'HD-0826-042', room: 'A1-312', representative: '222533187', roomFee: '480.000', utilityFee: '243.846', penaltyFee: '0', total: '723.846', status: 'Nợ quá hạn' },
  { id: 'HD-0926-004', room: 'A6-512', representative: '224031867', roomFee: '480.000', utilityFee: '721.050', penaltyFee: '0', total: '1.201.050', status: 'Đã thanh toán' },
];

export default function BillingManagement() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-lg tracking-tight">
            <BedDouble className="w-6 h-6" />
            <span>UTC Dormitory</span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          <NavItem icon={<LayoutDashboard />} label="Dashboard Overview" />
          <NavItem icon={<Users />} label="Quản lý Sinh viên" />
          <NavItem icon={<BedDouble />} label="Quản lý Phòng & CSVC" />
          <NavItem icon={<CreditCard />} label="Hóa đơn & Dịch vụ" active />
          <div className="mt-auto pt-6">
            <NavItem icon={<Settings />} label="Cài đặt hệ thống" />
          </div>
        </nav>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER CHUNG */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1"></div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-blue-900 transition-colors rounded-full hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button className="flex items-center gap-3 text-left">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&auto=format" 
                alt="Accountant Avatar" 
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="hidden lg:block text-sm">
                <p className="font-medium text-slate-800">Đinh Hồng Quyên</p>
                <p className="text-slate-500 text-xs">Kế toán KTX</p>
              </div>
            </button>
          </div>
        </header>

        {/* NỘI DUNG TRANG QUẢN LÝ HÓA ĐƠN */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* PAGE HEADER & ACTIONS */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-blue-900 tracking-tight">Quản lý Hóa đơn & Dịch vụ</h1>
                <p className="text-slate-500 mt-1 text-sm">Tính toán phí gộp, đối soát VNPAY và quản lý công nợ sinh viên.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                  <Download className="w-4 h-4" /> Xuất Excel
                </button>
                <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                  <Zap className="w-4 h-4 text-yellow-500" /> Nhập chỉ số điện nước
                </button>
                <button className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-md shadow-blue-900/20">
                  <FilePlus className="w-4 h-4" /> Lập hóa đơn hàng loạt
                </button>
              </div>
            </div>

            {/* OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OverviewCard 
                title="Tổng doanh thu (Tháng 9/2026)" 
                value="284.520.000đ" 
                subtitle="+12% so với tháng trước" 
                icon={<TrendingUp className="text-blue-600 w-5 h-5" />} 
                border="border-blue-200" 
              />
              <OverviewCard 
                title="Tổng dư nợ chưa thu" 
                value="32.150.000đ" 
                subtitle="Gồm 18 hóa đơn quá hạn" 
                icon={<AlertCircle className="text-red-500 w-5 h-5" />} 
                border="border-red-200" 
              />
              <OverviewCard 
                title="Tỷ lệ hoàn thành thanh toán" 
                value="88.5%" 
                subtitle="Đã đối soát VNPAY" 
                icon={<CheckCircle2 className="text-green-600 w-5 h-5" />} 
                border="border-green-200" 
              />
            </div>

            {/* BỘ LỌC & TÌM KIẾM (FILTER CARD) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Mã HĐ, Mã SV, Phòng..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                />
              </div>
              
              <div className="flex gap-3 w-full overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max border-l border-slate-200 pl-4 hidden md:flex">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500 font-medium">Lọc:</span>
                </div>
                <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[130px]">
                  <option value="09/2026">Tháng 09/2026</option>
                  <option value="08/2026">Tháng 08/2026</option>
                  <option value="07/2026">Tháng 07/2026</option>
                </select>
                <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[120px]">
                  <option value="">Tòa nhà</option>
                  <option value="A1">Tòa A1</option>
                  <option value="A4">Tòa A4</option>
                  <option value="A6">Tòa A6</option>
                </select>
                <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[150px]">
                  <option value="">Trạng thái</option>
                  <option value="Đã thanh toán">Đã thanh toán</option>
                  <option value="Chờ thanh toán">Chờ thanh toán</option>
                  <option value="Nợ quá hạn">Nợ quá hạn</option>
                </select>
              </div>
            </div>

            {/* DATA TABLE - Zebra Striping */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200">
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã HĐ</th>
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tòa/Phòng</th>
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Đại diện (Mã SV)</th>
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Tiền phòng</th>
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Điện & Nước</th>
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Phụ phí</th>
                      <th className="px-4 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider text-right">Tổng tiền (VNĐ)</th>
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                      <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {BILLS.map((bill) => (
                      <tr key={bill.id} className="even:bg-slate-50/60 hover:bg-blue-50/40 transition-colors group">
                        <td className="px-4 py-4 font-medium text-blue-900 whitespace-nowrap">{bill.id}</td>
                        <td className="px-4 py-4 font-medium text-slate-800">{bill.room}</td>
                        <td className="px-4 py-4 text-slate-600">{bill.representative}</td>
                        <td className="px-4 py-4 text-slate-600 text-right">{bill.roomFee}</td>
                        <td className="px-4 py-4 text-slate-600 text-right">{bill.utilityFee}</td>
                        <td className="px-4 py-4 text-slate-600 text-right">{bill.penaltyFee !== '0' ? <span className="text-red-500 font-medium">{bill.penaltyFee}</span> : '-'}</td>
                        <td className="px-4 py-4 font-bold text-slate-800 text-right">{bill.total}</td>
                        <td className="px-4 py-4 text-center">
                          <StatusBadge status={bill.status} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ActionButton icon={<Eye />} tooltip="Xem chi tiết" />
                            <ActionButton icon={<Edit />} tooltip="Sửa hóa đơn" />
                            {/* Nút nhắc nợ nổi bật cho hóa đơn chưa thanh toán/quá hạn */}
                            {(bill.status === 'Nợ quá hạn' || bill.status === 'Chờ thanh toán') && (
                              <ActionButton 
                                icon={<BellRing />} 
                                tooltip="Gửi nhắc nợ" 
                                alert={bill.status === 'Nợ quá hạn'} 
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Mock */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-sm text-slate-500">Hiển thị <span className="font-medium text-slate-800">1</span> đến <span className="font-medium text-slate-800">6</span> trong số <span className="font-medium text-slate-800">230</span> hóa đơn</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border border-slate-200 bg-white text-slate-600 rounded hover:bg-slate-100 text-sm disabled:opacity-50" disabled>Trước</button>
                  <button className="px-3 py-1 border border-slate-200 bg-white text-slate-600 rounded hover:bg-slate-100 text-sm">Tiếp</button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function NavItem({ icon, label, active = false }) {
  return (
    <button 
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
        ${active 
          ? 'bg-blue-900 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-blue-900'
        }`}
    >
      <span className={active ? 'text-blue-200' : 'text-slate-400'}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </span>
      {label}
    </button>
  );
}

function OverviewCard({ title, value, subtitle, icon, border }) {
  return (
    <div className={`bg-white p-5 rounded-xl border-l-4 ${border} border-y border-r border-y-slate-200 border-r-slate-200 shadow-sm flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-500">{title}</span>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-end gap-2 mt-auto">
        <span className="text-2xl font-bold text-slate-800">{value}</span>
      </div>
      <span className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Đã thanh toán': 'bg-green-100 text-green-800 border-green-200',
    'Chờ thanh toán': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Nợ quá hạn': 'bg-red-100 text-red-800 border-red-200 font-bold'
  };
  
  const dots = {
    'Đã thanh toán': 'bg-green-500',
    'Chờ thanh toán': 'bg-yellow-500',
    'Nợ quá hạn': 'bg-red-600 animate-pulse' // Hiệu ứng nhấp nháy nhẹ cho nợ quá hạn
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]}`}></span>
      {status}
    </span>
  );
}

function ActionButton({ icon, tooltip, alert }) {
  return (
    <button 
      title={tooltip}
      className={`p-1.5 rounded-md transition-colors
        ${alert 
          ? 'text-red-500 hover:text-red-700 hover:bg-red-50' 
          : 'text-slate-400 hover:text-blue-900 hover:bg-blue-50'}`}
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  );
}