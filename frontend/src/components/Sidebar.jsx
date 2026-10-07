import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  DoorOpen, 
  Receipt, 
  Wrench, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

const Sidebar = () => {
  // Trạng thái thu gọn/mở rộng thanh điều hướng
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Trạng thái lưu mục đang được chọn (Active)
  // Danh sách các mục menu chính
  const mainMenuItems = [
    { id: 'dashboard', path: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'students', path: '/students', label: 'Quản lý Sinh viên', icon: Users },
    { id: 'rooms', path: '/rooms', label: 'Quản lý Phòng & CSVC', icon: DoorOpen },
    { id: 'billing', path: '/financial-dashboard', label: 'Hóa đơn & Dịch vụ', icon: Receipt },
    { id: 'tickets', path: '/tickets', label: 'Yêu cầu sửa chữa', icon: Wrench },
  ];
  const activeItem = mainMenuItems.find((item) => item.path === location.pathname)?.id || 'dashboard';

  return (
    <div 
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out font-sans ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* 1. Brand / Logo Area */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-gray-100 shrink-0">
        <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : 'w-full px-2'}`}>
          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-lg font-black tracking-tight text-blue-900 leading-none">CampusLodge</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">KTX GTVT</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-hide">
        {!isCollapsed && (
          <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Menu Chính
          </p>
        )}
        
        {mainMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={isCollapsed ? item.label : ''}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-50 text-blue-900' // Trạng thái Active
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-800' // Trạng thái Default & Hover
                }
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <Icon className={`shrink-0 transition-colors ${
                isActive ? 'w-5 h-5 text-blue-700' : 'w-5 h-5 group-hover:text-blue-600'
              }`} />
              
              {!isCollapsed && (
                <span className={`text-sm whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              )}

              {/* Dấu chấm báo hiệu có thông báo mới (ví dụ hiển thị ở tab Tickets) */}
              {!isCollapsed && item.id === 'tickets' && (
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom Section (Settings, Logout, Collapse Toggle) */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 shrink-0 space-y-1.5">
        
        <button
          title={isCollapsed ? 'Cài đặt' : ''}
          className={`
            w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-800 transition-all duration-200 group
            ${isCollapsed ? 'justify-center' : 'justify-start'}
          `}
        >
          <Settings className="w-5 h-5 shrink-0 group-hover:rotate-45 transition-transform duration-300" />
          {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Cài đặt</span>}
        </button>

        <button
          title={isCollapsed ? 'Đăng xuất' : ''}
          className={`
            w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group
            ${isCollapsed ? 'justify-center' : 'justify-start'}
          `}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Đăng xuất</span>}
        </button>

        {/* Nút Thu gọn / Mở rộng */}
        <div className="pt-2 mt-2 border-t border-gray-200/60">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 transition-all duration-200
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold whitespace-nowrap uppercase tracking-wider">Thu gọn Sidebar</span>
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default Sidebar;
