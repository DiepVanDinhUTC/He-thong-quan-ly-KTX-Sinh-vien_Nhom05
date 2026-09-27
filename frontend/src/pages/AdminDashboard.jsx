import React from 'react';
import { 
  Search, Bell, LayoutDashboard, Users, 
  BedDouble, CreditCard, Settings, Plus, 
  Zap, CheckCircle, AlertTriangle, Clock,
  MoreVertical, Wrench, MessageSquare
} from 'lucide-react';

// --- MOCK DATA ĐÃ ĐƯỢC ĐỒNG BỘ BỐI CẢNH UTC DORMITORY ---
const STATS = [
  { label: 'Tổng số sinh viên', value: '1,248', trend: '+12 trong tháng này', alert: false },
  { label: 'Phòng trống', value: '42', trend: 'Sẵn sàng xếp phòng', alert: true },
  { label: 'Doanh thu tháng 9', value: '284.5Tr', trend: '+4.2% so với tháng trước', alert: false },
  { label: 'Yêu cầu chờ xử lý', value: '18', trend: '5 sự cố khẩn cấp', warning: true },
];

const REQUESTS = [
  { id: 'YC-8021', student: 'Nguyễn Thanh Dương', room: 'A1-417', type: 'Báo hỏng CSVC', status: 'Chờ xử lý', date: '2 giờ trước' },
  { id: 'YC-8020', student: 'Trần Hoài Nam', room: 'A4-311', type: 'Xin chuyển phòng', status: 'Chờ xử lý', date: '5 giờ trước' },
  { id: 'YC-8019', student: 'Vương Toàn Quy', room: 'A6-401', type: 'Góp ý/Khiếu nại', status: 'Đã giải quyết', date: '1 ngày trước' },
  { id: 'YC-8018', student: 'Trần Danh Hoàng Anh', room: 'A4-412', type: 'Báo hỏng CSVC', status: 'Đã giải quyết', date: '2 ngày trước' },
];

export default function AdminDashboard() {
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
          <NavItem icon={<LayoutDashboard />} label="Dashboard Overview" active />
          <NavItem icon={<Users />} label="Quản lý Sinh viên" />
          <NavItem icon={<BedDouble />} label="Quản lý Phòng & CSVC" />
          <NavItem icon={<CreditCard />} label="Hóa đơn & Dịch vụ" />
          <div className="mt-auto pt-6">
            <NavItem icon={<Settings />} label="Cài đặt hệ thống" />
          </div>
        </nav>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER CHUNG */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm sinh viên, phòng, hoặc mã hóa đơn..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-blue-900 transition-colors rounded-full hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button className="flex items-center gap-3 text-left">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&auto=format" 
                alt="Admin Avatar" 
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="hidden lg:block text-sm">
                <p className="font-medium text-slate-800">Trưởng Ban QL</p>
                <p className="text-slate-500 text-xs">Admin / Director</p>
              </div>
            </button>
          </div>
        </header>

        {/* NỘI DUNG TRANG CHỦ DASHBOARD */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* PAGE HEADER */}
            <div>
              <h1 className="text-2xl font-bold text-blue-900 tracking-tight">Tổng quan Hệ thống</h1>
              <p className="text-slate-500 mt-1 text-sm">Theo dõi lưu lượng lưu trú, doanh thu và các yêu cầu khẩn cấp từ sinh viên.</p>
            </div>

            {/* METRICS (Overview Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map((stat, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-sm font-semibold text-slate-500 mb-2">{stat.label}</span>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-3xl font-bold text-slate-800">{stat.value}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    {stat.warning ? (
                      <span className="flex items-center text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200">
                        <Clock className="w-3 h-3 mr-1" /> {stat.trend}
                      </span>
                    ) : stat.alert ? (
                      <span className="flex items-center text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" /> {stat.trend}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">{stat.trend}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* TWO COLUMN LAYOUT: Quick Actions & Data Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* CỘT 1: THAO TÁC NHANH (Quick Actions) */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-bold text-slate-800">Thao tác nhanh</h2>
                <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <ActionCard 
                    icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
                    title="Duyệt đơn đăng ký nội trú"
                    description="Có 12 hồ sơ đang chờ xét duyệt"
                    bg="bg-blue-50"
                  />
                  <div className="h-px bg-slate-100 mx-4"></div>
                  <ActionCard 
                    icon={<Zap className="w-5 h-5 text-yellow-600" />}
                    title="Lập hóa đơn điện nước"
                    description="Kỳ thu phí tháng 09/2026"
                    bg="bg-yellow-50"
                  />
                  <div className="h-px bg-slate-100 mx-4"></div>
                  <ActionCard 
                    icon={<Plus className="w-5 h-5 text-emerald-600" />}
                    title="Đăng thông báo chung"
                    description="Gửi thông báo tới toàn bộ sinh viên"
                    bg="bg-emerald-50"
                  />
                </div>
              </div>

              {/* CỘT 2: BẢNG DỮ LIỆU (Recent Requests) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">Yêu cầu & Sự cố gần đây</h2>
                  <button className="text-sm text-blue-700 font-semibold hover:text-blue-900">Xem tất cả &rarr;</button>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200">
                          <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã YC</th>
                          <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sinh viên & Phòng</th>
                          <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phân loại</th>
                          <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                          <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {REQUESTS.map((req) => (
                          <tr key={req.id} className="even:bg-slate-50/60 hover:bg-blue-50/40 transition-colors group">
                            <td className="px-5 py-4 font-medium text-blue-900 whitespace-nowrap">{req.id}</td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-800">{req.student}</p>
                              <p className="text-xs font-medium text-slate-500 mt-0.5">Phòng {req.room}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              <span className="flex items-center gap-1.5 font-medium">
                                {req.type === 'Báo hỏng CSVC' && <Wrench className="w-3.5 h-3.5 text-slate-400" />}
                                {req.type === 'Xin chuyển phòng' && <BedDouble className="w-3.5 h-3.5 text-slate-400" />}
                                {req.type === 'Góp ý/Khiếu nại' && <MessageSquare className="w-3.5 h-3.5 text-slate-400" />}
                                {req.type}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <StatusBadge status={req.status} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button className="p-1.5 text-slate-400 hover:text-blue-900 rounded-md hover:bg-blue-50 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

function ActionCard({ icon, title, description, bg }) {
  return (
    <button className="w-full text-left p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors rounded-lg group">
      <div className={`p-2.5 rounded-lg ${bg} shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-900 transition-colors">{title}</h3>
        <p className="text-xs font-medium text-slate-500 mt-1">{description}</p>
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const isPending = status === 'Chờ xử lý';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap
      ${isPending ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPending ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
      {status}
    </span>
  );
}