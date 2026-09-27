import React, { useState } from 'react';
import { 
  Search, Bell, LayoutDashboard, Users, 
  BedDouble, CreditCard, Settings, Plus, 
  LayoutGrid, List, Wind, Thermometer, 
  Wifi, ShieldAlert, CheckCircle, Clock
} from 'lucide-react';

// --- MOCK DATA ---
const ROOMS = [
  { id: '1', name: 'A1-102', building: 'A1', type: 'Tiêu chuẩn 8 người', capacity: 8, occupancy: 8, status: 'Kín chỗ', price: '120.000đ', facilities: ['wifi'] },
  { id: '2', name: 'A1-205', building: 'A1', type: 'Tiêu chuẩn 8 người', capacity: 8, occupancy: 5, status: 'Còn chỗ', price: '120.000đ', facilities: ['wifi'] },
  { id: '3', name: 'A4-301', building: 'A4', type: 'Dịch vụ 4 người', capacity: 4, occupancy: 4, status: 'Kín chỗ', price: '450.000đ', facilities: ['ac', 'heater', 'wifi'] },
  { id: '4', name: 'A4-412', building: 'A4', type: 'Dịch vụ 4 người', capacity: 4, occupancy: 2, status: 'Còn chỗ', price: '450.000đ', facilities: ['ac', 'heater', 'wifi'] },
  { id: '5', name: 'A5-101', building: 'A5', type: 'Tiêu chuẩn 8 người', capacity: 8, occupancy: 0, status: 'Đang bảo trì', price: '120.000đ', facilities: ['wifi'] },
  { id: '6', name: 'A6-505', building: 'A6', type: 'Tiêu chuẩn 8 người', capacity: 8, occupancy: 7, status: 'Còn chỗ', price: '120.000đ', facilities: ['wifi'] },
  { id: '7', name: 'A4-202', building: 'A4', type: 'Dịch vụ 4 người', capacity: 4, occupancy: 0, status: 'Còn chỗ', price: '450.000đ', facilities: ['ac', 'heater', 'wifi'] },
];

export default function RoomManagement() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Tính toán thống kê nhanh từ MOCK DATA
  const totalRooms = ROOMS.length;
  const availableRooms = ROOMS.filter(r => r.status === 'Còn chỗ').length;
  const fullRooms = ROOMS.filter(r => r.status === 'Kín chỗ').length;
  const maintenanceRooms = ROOMS.filter(r => r.status === 'Đang bảo trì').length;

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
          <NavItem icon={<BedDouble />} label="Quản lý Phòng & CSVC" active />
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

        {/* NỘI DUNG TRANG QUẢN LÝ PHÒNG */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* PAGE HEADER */}
            <div>
              <h1 className="text-2xl font-bold text-blue-900 tracking-tight">Quản lý Phòng & Cơ sở vật chất</h1>
              <p className="text-slate-500 mt-1 text-sm">Giám sát tình trạng lưu trú, công suất phòng và bảo trì thiết bị.</p>
            </div>

            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Tổng số phòng" value={totalRooms} subtitle="Trên toàn hệ thống" icon={<BedDouble className="text-blue-600 w-5 h-5" />} border="border-blue-200" />
              <MetricCard title="Đang trống" value={availableRooms} subtitle="Có thể xếp thêm" icon={<CheckCircle className="text-green-600 w-5 h-5" />} border="border-green-200" />
              <MetricCard title="Đã kín chỗ" value={fullRooms} subtitle="Đạt 100% công suất" icon={<Users className="text-slate-500 w-5 h-5" />} border="border-slate-300" />
              <MetricCard title="Đang bảo trì" value={maintenanceRooms} subtitle="Khóa tạm thời" icon={<ShieldAlert className="text-red-500 w-5 h-5" />} border="border-red-200" />
            </div>

            {/* TOOLBAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm mã phòng (VD: A1-102)..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                  />
                </div>
                
                <div className="flex gap-2 w-full overflow-x-auto pb-1 sm:pb-0">
                  <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[120px]">
                    <option value="">Tòa nhà</option>
                    <option value="A1">Tòa A1</option>
                    <option value="A4">Tòa A4</option>
                    <option value="A5">Tòa A5</option>
                    <option value="A6">Tòa A6</option>
                  </select>
                  <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[140px]">
                    <option value="">Loại phòng</option>
                    <option value="Tiêu chuẩn">Tiêu chuẩn 8 người</option>
                    <option value="Dịch vụ">Dịch vụ 4 người</option>
                  </select>
                  <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 min-w-[130px]">
                    <option value="">Trạng thái</option>
                    <option value="Còn chỗ">Còn chỗ</option>
                    <option value="Kín chỗ">Kín chỗ</option>
                    <option value="Bảo trì">Đang sửa</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-blue-900' : 'text-slate-400 hover:text-slate-700'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-blue-900' : 'text-slate-400 hover:text-slate-700'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /> Thêm phòng mới
                </button>
              </div>
            </div>

            {/* ROOM GRID VIEW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {ROOMS.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
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

function MetricCard({ title, value, subtitle, icon, border }) {
  return (
    <div className={`bg-white p-5 rounded-xl border-l-4 ${border} border-y border-r border-y-slate-200 border-r-slate-200 shadow-sm flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-500">{title}</span>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-end gap-2 mt-auto">
        <span className="text-3xl font-bold text-slate-800">{value}</span>
      </div>
      <span className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</span>
    </div>
  );
}

function RoomCard({ room }) {
  // Tính % lấp đầy phòng
  const fillPercentage = (room.occupancy / room.capacity) * 100;
  
  // Màu Status
  const statusStyles = {
    'Còn chỗ': 'bg-green-100 text-green-700',
    'Kín chỗ': 'bg-slate-100 text-slate-600',
    'Đang bảo trì': 'bg-red-100 text-red-700'
  };

  const barColor = room.status === 'Đang bảo trì' 
    ? 'bg-red-500' 
    : fillPercentage === 100 ? 'bg-slate-500' : 'bg-blue-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col group cursor-pointer">
      {/* Card Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-blue-900 group-hover:text-blue-700 transition-colors">{room.name}</h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">{room.type}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${statusStyles[room.status]}`}>
          {room.status}
        </span>
      </div>
      
      {/* Card Body - Progress & Price */}
      <div className="p-4 flex-1">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sức chứa</span>
          <span className="text-sm font-bold text-slate-800">{room.occupancy} <span className="text-slate-400 font-medium">/ {room.capacity} người</span></span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 border border-slate-200/50 overflow-hidden">
          <div className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${fillPercentage}%` }}></div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-slate-500">Đơn giá / tháng</span>
          <span className="text-sm font-bold text-blue-900">{room.price}</span>
        </div>
      </div>

      {/* Card Footer - Facilities */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-400">
          {room.facilities.includes('ac') && <Wind className="w-4 h-4 hover:text-slate-600" title="Điều hòa" />}
          {room.facilities.includes('heater') && <Thermometer className="w-4 h-4 hover:text-slate-600" title="Bình nóng lạnh" />}
          {room.facilities.includes('wifi') && <Wifi className="w-4 h-4 hover:text-slate-600" title="Internet/Wifi" />}
        </div>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          Chi tiết &rarr;
        </button>
      </div>
    </div>
  );
}