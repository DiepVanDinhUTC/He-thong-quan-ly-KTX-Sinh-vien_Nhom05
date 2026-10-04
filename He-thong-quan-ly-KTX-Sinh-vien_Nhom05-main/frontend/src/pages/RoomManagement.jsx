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
  Filter,
  Plus,
  Wind,
  Lightbulb,
  Bed,
  Archive,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  MapPin,
  Edit3
} from 'lucide-react';

const RoomManagement = () => {
  const [selectedRoomId, setSelectedRoomId] = useState('104');
  const [searchQuery, setSearchQuery] = useState('');

  // Dữ liệu mẫu (Mock data)
  const rooms = [
    { id: '101', building: 'A1', type: 'Phòng Điều hòa', status: 'occupied', current: 8, max: 8 },
    { id: '102', building: 'A1', type: 'Phòng Quạt', status: 'empty', current: 0, max: 8 },
    { id: '103', building: 'A1', type: 'Phòng Điều hòa', status: 'occupied', current: 5, max: 8 },
    { id: '104', building: 'A1', type: 'Phòng Điều hòa', status: 'maintenance', current: 0, max: 8, issue: 'Hỏng điều hòa' },
    { id: '105', building: 'A1', type: 'Phòng Quạt', status: 'empty', current: 0, max: 8 },
    { id: '201', building: 'A5', type: 'Phòng Quạt', status: 'occupied', current: 8, max: 8 },
    { id: '202', building: 'A5', type: 'Phòng Điều hòa', status: 'occupied', current: 6, max: 8 },
    { id: '203', building: 'A5', type: 'Phòng Quạt', status: 'occupied', current: 8, max: 8 },
  ];

  const facilities = [
    { id: 'TB001', name: 'Giường tầng sắt', quantity: 4, status: 'good', icon: Bed },
    { id: 'TB002', name: 'Tủ cá nhân 2 ngăn', quantity: 8, status: 'good', icon: Archive },
    { id: 'TB003', name: 'Điều hòa Daikin 12000 BTU', quantity: 1, status: 'broken', icon: Wind },
    { id: 'TB004', name: 'Quạt trần Vinawind', quantity: 2, status: 'good', icon: Wind },
    { id: 'TB005', name: 'Bóng đèn tuýp LED', quantity: 4, status: 'good', icon: Lightbulb },
  ];

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800 antialiased font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-blue-900 text-white flex flex-col h-full shadow-lg flex-shrink-0">
        <div className="p-6 flex items-center justify-center border-b border-blue-800">
          <Building className="w-8 h-8 mr-3" />
          <h1 className="text-xl font-bold tracking-wider">KTX GTVT</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors">
            <Home className="w-5 h-5" />
            <span className="ml-3">Trang chủ</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors">
            <UserPlus className="w-5 h-5" />
            <span className="ml-3">Quản lý Sinh viên</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 bg-blue-800 rounded-lg text-white font-medium">
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
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8 z-10 flex-shrink-0 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Quản lý Phòng & Cơ sở vật chất</h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Area - 2 Columns Layout */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
          
          {/* Left Column: Room Grid */}
          <div className="w-full md:w-2/3 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-1 gap-3 w-full">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Tìm mã phòng..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50"
                  />
                </div>
                <select className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
                  <option>Tòa A1</option>
                  <option>Tòa A5</option>
                  <option>Tòa A6</option>
                </select>
                <button className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4" />
                <span>Thêm phòng</span>
              </button>
            </div>

            {/* Room Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rooms.map((room) => (
                  <div 
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedRoomId === room.id ? 'ring-2 ring-blue-500 border-transparent shadow-md' : 'hover:shadow-md'}
                      ${room.status === 'occupied' ? 'border-blue-100 bg-blue-50/30 hover:border-blue-300' : ''}
                      ${room.status === 'empty' ? 'border-green-100 bg-green-50/30 hover:border-green-300' : ''}
                      ${room.status === 'maintenance' ? 'border-red-200 bg-red-50/50 hover:border-red-300' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800 text-lg">P.{room.id}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                        ${room.status === 'occupied' ? 'bg-blue-100 text-blue-700' : ''}
                        ${room.status === 'empty' ? 'bg-green-100 text-green-700' : ''}
                        ${room.status === 'maintenance' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {room.status === 'occupied' ? 'Đang ở' : room.status === 'empty' ? 'Trống' : 'Bảo trì'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 flex items-center"><Building className="w-3 h-3 mr-1"/> Tòa {room.building} &bull; {room.type}</p>
                    
                    {room.status !== 'maintenance' ? (
                      <div className="bg-white rounded-lg p-2 border border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Sức chứa</span>
                        <span className={`text-sm font-bold ${room.current === room.max ? 'text-blue-700' : 'text-green-600'}`}>{room.current}/{room.max}</span>
                      </div>
                    ) : (
                      <div className="bg-red-100 rounded-lg p-2 border border-red-200 flex items-center">
                        <AlertTriangle className="w-3 h-3 text-red-600 mr-1.5 flex-shrink-0" />
                        <span className="text-xs text-red-700 font-medium truncate" title={room.issue}>{room.issue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Room Details & Facilities */}
          <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {selectedRoom ? (
              <>
                <div className="p-6 border-b border-gray-200 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        Phòng {selectedRoom.id}
                        <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">Tòa {selectedRoom.building}</span>
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{selectedRoom.type}</p>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Trạng thái</p>
                      <p className={`text-sm font-semibold
                        ${selectedRoom.status === 'occupied' ? 'text-blue-600' : ''}
                        ${selectedRoom.status === 'empty' ? 'text-green-600' : ''}
                        ${selectedRoom.status === 'maintenance' ? 'text-red-600' : ''}
                      `}>
                        {selectedRoom.status === 'occupied' ? 'Đang sử dụng' : selectedRoom.status === 'empty' ? 'Phòng trống' : 'Đang bảo trì'}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Lấp đầy</p>
                      <p className="text-sm font-semibold text-gray-800">{selectedRoom.current} / {selectedRoom.max} Sinh viên</p>
                    </div>
                  </div>
                  
                  {selectedRoom.status === 'maintenance' && (
                    <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                      <Wrench className="w-4 h-4" />
                      <span>Xem Ticket Đang Xử Lý</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h4 className="font-semibold text-gray-800">Danh mục Tài sản (CSVC)</h4>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Thêm
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {facilities.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                              ${item.status === 'good' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}
                            `}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Mã: {item.id} &bull; SL: {item.quantity}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {item.status === 'good' ? (
                              <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Tốt
                              </span>
                            ) : (
                              <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Hư hỏng
                              </span>
                            )}
                            <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
                <MapPin className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-center font-medium">Chọn một phòng từ danh sách để xem chi tiết cơ sở vật chất.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RoomManagement;
