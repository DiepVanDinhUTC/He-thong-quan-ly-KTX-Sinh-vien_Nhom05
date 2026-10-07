import React from 'react';
import Sidebar from './Sidebar'; // Component Sidebar vừa được tạo
import { Bell, Search } from 'lucide-react';
import AdminUserProfile from './AdminUserProfile';

const AdminLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* 1. Cột trái: Component Sidebar Điều hướng */}
      <Sidebar />

      {/* 2. Cột phải: Khu vực Nội dung chính (Main Area) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Topbar / Header chung cho mọi trang */}
        <header className="bg-white/90 backdrop-blur-md shadow-sm h-16 flex items-center justify-between px-6 sm:px-8 z-10 border-b border-gray-200 shrink-0">
          
          {/* Ô Tìm kiếm toàn cục (Global Search) */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm kiếm nhanh sinh viên, mã phòng, mã hóa đơn..." 
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50 hover:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Khu vực Thông báo & Profile cá nhân */}
          <div className="flex items-center gap-4 shrink-0">
            <button className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50">
              <Bell className="w-5 h-5" />
              {/* Dấu chấm đỏ báo có thông báo mới */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <AdminUserProfile variant="header" />
          </div>
        </header>

        {/* 3. Vùng chứa Nội dung động (Dynamic Content) */}
        {/* Nơi này sẽ render các trang con như Quản lý Sinh viên, Quản lý Phòng, Dashboard... */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto w-full h-full animate-in fade-in duration-500">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  );
};

export default AdminLayout;
