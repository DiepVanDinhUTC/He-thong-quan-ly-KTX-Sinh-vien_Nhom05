import React, { useState } from 'react';
import { 
  Building, 
  Home, 
  UserPlus, 
  DoorOpen, 
  FileSignature, 
  Wrench, 
  User, 
  Search, 
  Bell, 
  FileText, 
  XCircle, 
  UserCog,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';

const AdminDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Dữ liệu mẫu (Mock data)
  const rooms = [
    { id: '101', status: 'occupied', current: 8, max: 8 },
    { id: '102', status: 'empty', current: 0, max: 8 },
    { id: '103', status: 'occupied', current: 5, max: 8 },
    { id: '104', status: 'maintenance', issue: 'Hỏng quạt' },
    { id: '105', status: 'empty', current: 0, max: 8 },
    { id: '106', status: 'occupied', current: 8, max: 8 },
    { id: '107', status: 'occupied', current: 7, max: 8 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 text-gray-800 antialiased font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-blue-900 text-white flex flex-col h-full shadow-lg flex-shrink-0">
        <div className="p-6 flex items-center justify-center border-b border-blue-800">
          <Building className="w-8 h-8 mr-3" />
          <h1 className="text-xl font-bold tracking-wider">KTX GTVT</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-blue-800 rounded-lg text-white font-medium">
            <Home className="w-5 h-5" />
            <span className="ml-3">Trang chủ</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors">
            <UserPlus className="w-5 h-5" />
            <span className="ml-3">Quản lý Sinh viên</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors">
            <DoorOpen className="w-5 h-5" />
            <span className="ml-3">Quản lý Phòng & CSVC</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors">
            <FileSignature className="w-5 h-5" />
            <span className="ml-3">Quản lý Hợp đồng</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors">
            <Wrench className="w-5 h-5" />
            <span className="ml-3">Ticket báo hỏng</span>
          </a>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Nguyễn Văn A</p>
              <p className="text-xs text-blue-300">Nhân viên BQL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8 z-10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard Tổng Quan</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm kiếm phòng, sinh viên..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-gray-50"
              />
            </div>
            <button className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Main */}
        <main className="flex-1 overflow-auto p-8 space-y-6">
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-start px-6 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700 text-left">Duyệt & Lập hợp đồng nháp</span>
            </button>
            <button className="flex items-center justify-start px-6 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-gray-600 group-hover:text-white transition-colors flex-shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700 text-left">Thanh lý hợp đồng</span>
            </button>
            <button className="flex items-center justify-start px-6 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
              <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white transition-colors flex-shrink-0">
                <UserCog className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700 text-left">Phân công kỹ thuật viên</span>
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Room Map */}
            <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col min-h-[500px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Sơ đồ phòng <span className="text-sm font-normal text-gray-500 ml-2">(Tầng 1 - Tòa A1)</span>
                </h3>
                <div className="flex gap-4 text-sm font-medium">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Trống</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Đang ở</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Bảo trì</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-2 pb-2">
                {rooms.map((room) => (
                  <div 
                    key={room.id}
                    className={`border-2 rounded-xl p-4 relative cursor-pointer hover:shadow-md transition-all group
                      ${room.status === 'occupied' ? 'border-blue-100 bg-blue-50/50 hover:border-blue-300' : ''}
                      ${room.status === 'empty' ? 'border-green-100 bg-green-50/50 hover:border-green-300' : ''}
                      ${room.status === 'maintenance' ? 'border-red-200 bg-red-50 hover:border-red-400' : ''}
                    `}
                  >
                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full shadow-sm
                      ${room.status === 'occupied' ? 'bg-blue-500' : ''}
                      ${room.status === 'empty' ? 'bg-green-500' : ''}
                      ${room.status === 'maintenance' ? 'bg-red-500 animate-pulse' : ''}
                    `}></div>
                    
                    <h4 className="font-bold text-gray-800 text-lg">{room.id}</h4>
                    
                    <p className={`text-xs mt-1 font-medium
                      ${room.status === 'occupied' ? 'text-gray-500' : ''}
                      ${room.status === 'empty' ? 'text-gray-500' : ''}
                      ${room.status === 'maintenance' ? 'text-red-600' : ''}
                    `}>
                      {room.status === 'occupied' && 'Đang ở'}
                      {room.status === 'empty' && 'Trống'}
                      {room.status === 'maintenance' && 'Bảo trì'}
                    </p>
                    
                    <div className="mt-3 flex items-end justify-between">
                      {room.status !== 'maintenance' ? (
                        <>
                          <p className={`text-sm font-bold ${room.status === 'empty' ? 'text-green-700' : 'text-blue-700'}`}>
                            {room.current}/{room.max} <span className="text-xs font-normal">SV</span>
                          </p>
                          {room.status === 'empty' ? (
                            <DoorOpen className="w-5 h-5 text-green-200 group-hover:text-green-400 transition-colors" />
                          ) : (
                            <Users className="w-5 h-5 text-blue-200 group-hover:text-blue-400 transition-colors" />
                          )}
                        </>
                      ) : (
                        <p className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-md flex items-center">
                          <Wrench className="w-3 h-3 mr-1" /> {room.issue}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[500px]">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Danh sách chờ xử lý</h3>
              </div>
              
              <div className="overflow-y-auto flex-1 p-2">
                {/* Applications */}
                <div className="p-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">Đơn đăng ký chờ duyệt (2)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 shadow-sm">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">Nguyễn Thanh Tùng</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          2312001 &bull; Xin vào A1
                        </p>
                      </div>
                      <button className="px-3 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-xs font-medium rounded-lg transition-colors border border-yellow-200">
                        Duyệt
                      </button>
                    </div>
                    <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 shadow-sm">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">Lê Minh Tuấn</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          2312002 &bull; Xin vào A1
                        </p>
                      </div>
                      <button className="px-3 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-xs font-medium rounded-lg transition-colors border border-yellow-200">
                        Duyệt
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tickets */}
                <div className="p-3 mt-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">Ticket báo hỏng (2)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 hover:bg-red-50/50 rounded-xl transition-colors border border-red-100 bg-red-50/30 shadow-sm">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">P.104 A1 - Hỏng điều hòa</p>
                        <p className="text-xs text-red-600 font-medium mt-1 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Quá SLA (48h)
                        </p>
                      </div>
                      <button className="w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center" title="Phân công">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 shadow-sm">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">P.205 A5 - Tắc bồn cầu</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> Vừa xong
                        </p>
                      </div>
                      <button className="w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center" title="Phân công">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
