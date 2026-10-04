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
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

const StudentManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Dữ liệu mẫu (Mock data)
  const students = [
    { id: '2312001', name: 'Nguyễn Thanh Tùng', dob: '15/05/2005', gender: 'Nam', room: '101 - A1', phone: '0901234567', status: 'active' },
    { id: '2312002', name: 'Lê Minh Tuấn', dob: '22/08/2005', gender: 'Nam', room: '103 - A1', phone: '0902345678', status: 'pending' },
    { id: '2312003', name: 'Trần Thị Mai', dob: '10/11/2005', gender: 'Nữ', room: '201 - A5', phone: '0903456789', status: 'active' },
    { id: '2312004', name: 'Phạm Văn Hùng', dob: '05/01/2005', gender: 'Nam', room: '106 - A1', phone: '0904567890', status: 'violation' },
    { id: '2312005', name: 'Hoàng Bích Ngọc', dob: '18/09/2005', gender: 'Nữ', room: '205 - A5', phone: '0905678901', status: 'active' },
  ];

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Đang ở</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Chờ duyệt</span>;
      case 'violation':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Vi phạm</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Không rõ</span>;
    }
  };

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
          <a href="#" className="flex items-center px-4 py-3 bg-blue-800 rounded-lg text-white font-medium">
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
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8 z-10 flex-shrink-0 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Quản lý Hồ sơ Sinh viên</h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Scrollable Main */}
        <main className="flex-1 overflow-auto p-8 flex flex-col">
          
          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-1 w-full sm:w-auto gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm theo tên, mã SV, phòng..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white shadow-sm"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                <Filter className="w-4 h-4" />
                <span>Lọc</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* Nút Đồng bộ dữ liệu thiết kế theo tính năng API đã nêu trong dự án */}
              <button 
                onClick={handleSync}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 shadow-sm transition-colors"
                disabled={isSyncing}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ trường'}</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                <Plus className="w-4 h-4" />
                <span>Thêm thủ công</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <th className="px-6 py-4">Mã SV</th>
                    <th className="px-6 py-4">Họ và tên</th>
                    <th className="px-6 py-4">Ngày sinh</th>
                    <th className="px-6 py-4">Giới tính</th>
                    <th className="px-6 py-4">Phòng</th>
                    <th className="px-6 py-4">Số điện thoại</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-blue-600">{student.id}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{student.name}</td>
                      <td className="px-6 py-4 text-gray-600">{student.dob}</td>
                      <td className="px-6 py-4 text-gray-600">{student.gender}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium">{student.room}</td>
                      <td className="px-6 py-4 text-gray-600">{student.phone}</td>
                      <td className="px-6 py-4">{getStatusBadge(student.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Xem chi tiết">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Chỉnh sửa">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa/Thanh lý">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-gray-50 mt-auto">
              <div>Hiển thị 1 đến 5 trong số 1,200 sinh viên</div>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Trước</button>
                <button className="px-3 py-1 border border-blue-600 bg-blue-50 text-blue-600 rounded font-medium">1</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">2</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">3</button>
                <span className="px-2">...</span>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Sau</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentManagement;
