import React, { useState } from 'react';
import { 
  Search, Bell, LayoutDashboard, Users, 
  BedDouble, CreditCard, Settings, Plus, 
  Download, RefreshCw, MoreVertical, 
  Eye, Edit, ArrowRightLeft, ShieldAlert,
  Filter
} from 'lucide-react';

// --- MOCK DATA TỪ TÀI LIỆU KHẢO SÁT DỰ ÁN ---
const STUDENTS = [
  { id: '231220734', name: 'Nguyễn Thanh Dương', gender: 'Nam', class: 'CNTT1 - CNTT', room: 'A1-417', status: 'Đang ở' },
  { id: '241230803', name: 'Trần Hoài Nam', gender: 'Nam', class: 'KTTM - KT', room: 'Chưa xếp', status: 'Chờ xếp phòng' },
  { id: '231402171', name: 'Trần Danh Hoàng Anh', gender: 'Nữ', class: 'NNA - ĐT', room: 'A4-412', status: 'Vi phạm' },
  { id: '211611495', name: 'Nguyễn Việt Đức', gender: 'Nam', class: 'CKXD - CK', room: 'A4-311', status: 'Đã rời đi' },
  { id: '252601079', name: 'Vương Toàn Quy', gender: 'Nam', class: 'CNTT2 - CNTT', room: 'A6-401', status: 'Đang ở' },
];

export default function StudentManagement() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSIS = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000); // Giả lập gọi API đồng bộ sis.utc
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      
      {/* 1. SIDEBAR (Giữ nguyên cấu trúc, active mục Users) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-lg tracking-tight">
            <BedDouble className="w-6 h-6" />
            <span>UTC Dormitory</span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          <NavItem icon={<LayoutDashboard />} label="Dashboard Overview" />
          <NavItem icon={<Users />} label="Quản lý Sinh viên" active />
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
          <div className="flex items-center gap-4 flex-1"></div> {/* Khoảng trống đẩy profile sang phải */}
          
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

        {/* NỘI DUNG TRANG QUẢN LÝ SINH VIÊN */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* PAGE HEADER & ACTIONS */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-blue-900 tracking-tight">Quản lý Sinh viên nội trú</h1>
                <p className="text-slate-500 mt-1 text-sm">Tra cứu hồ sơ, theo dõi trạng thái lưu trú và đồng bộ dữ liệu đào tạo.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                  <Download className="w-4 h-4" /> Xuất Excel
                </button>
                <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /> Thêm sinh viên
                </button>
                <button 
                  onClick={handleSyncSIS}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-md shadow-blue-900/20"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
                  {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu SIS'}
                </button>
              </div>
            </div>

            {/* BỘ LỌC & TÌM KIẾM (FILTER CARD) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:w-96 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tìm theo Mã SV, Họ Tên, CCCD..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
                />
              </div>
              
              <div className="flex flex-1 gap-4 w-full overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max border-l border-slate-200 pl-4">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500 font-medium">Lọc theo:</span>
                </div>
                <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[120px]">
                  <option value="">Tòa nhà</option>
                  <option value="A1">Tòa A1</option>
                  <option value="A4">Tòa A4</option>
                  <option value="A5">Tòa A5</option>
                  <option value="A6">Tòa A6</option>
                </select>
                <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[120px]">
                  <option value="">Giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
                <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[160px]">
                  <option value="">Trạng thái nội trú</option>
                  <option value="Đang ở">Đang ở</option>
                  <option value="Chờ xếp phòng">Chờ xếp phòng</option>
                  <option value="Đã rời đi">Đã rời đi</option>
                  <option value="Vi phạm">Vi phạm/Kỷ luật</option>
                </select>
              </div>
            </div>

            {/* BẢNG DỮ LIỆU (DATA TABLE) - Zebra Striping */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 border-b border-slate-200">
                      <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã SV</th>
                      <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ và Tên</th>
                      <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Giới tính</th>
                      <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lớp / Khoa</th>
                      <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phòng hiện tại</th>
                      <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {STUDENTS.map((student) => (
                      <tr key={student.id} className="even:bg-slate-50/50 hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-4 font-medium text-blue-900">{student.id}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{student.name}</td>
                        <td className="px-5 py-4 text-slate-600">{student.gender}</td>
                        <td className="px-5 py-4 text-slate-600">{student.class}</td>
                        <td className="px-5 py-4 text-slate-600 font-medium">{student.room}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={student.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ActionButton icon={<Eye />} tooltip="Xem chi tiết" />
                            <ActionButton icon={<Edit />} tooltip="Sửa thông tin" />
                            <ActionButton icon={<ArrowRightLeft />} tooltip="Đổi phòng" />
                            <ActionButton icon={<ShieldAlert />} tooltip="Ghi nhận vi phạm" danger />
                          </div>
                          {/* Fallback 3 dots icon for mobile or non-hover devices */}
                          <button className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Phân trang (Pagination Mock) */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-sm text-slate-500">Hiển thị <span className="font-medium text-slate-800">1</span> đến <span className="font-medium text-slate-800">5</span> trong số <span className="font-medium text-slate-800">1,248</span> sinh viên</span>
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

function StatusBadge({ status }) {
  const styles = {
    'Đang ở': 'bg-green-100 text-green-800 border-green-200',
    'Chờ xếp phòng': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Đã rời đi': 'bg-slate-100 text-slate-600 border-slate-200',
    'Vi phạm': 'bg-red-100 text-red-800 border-red-200'
  };
  
  const dots = {
    'Đang ở': 'bg-green-500',
    'Chờ xếp phòng': 'bg-yellow-500',
    'Đã rời đi': 'bg-slate-400',
    'Vi phạm': 'bg-red-500'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]}`}></span>
      {status}
    </span>
  );
}

function ActionButton({ icon, tooltip, danger }) {
  return (
    <button 
      title={tooltip}
      className={`p-1.5 rounded-md transition-colors hidden md:block
        ${danger 
          ? 'text-red-400 hover:text-red-600 hover:bg-red-50' 
          : 'text-slate-400 hover:text-blue-900 hover:bg-blue-50'}`}
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  );
}