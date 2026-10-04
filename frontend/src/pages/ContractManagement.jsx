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
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileX,
  FilePlus,
  Store
} from 'lucide-react';

const ContractManagement = () => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'business'
  const [searchQuery, setSearchQuery] = useState('');

  // Dữ liệu mẫu (Mock data) cho Hợp đồng Sinh viên
  const studentContracts = [
    { id: 'HD26-001', studentName: 'Nguyễn Thanh Tùng', studentId: '2612001', room: '101 - A1', startDate: '05/09/2026', endDate: '05/09/2027', status: 'active' },
    { id: 'HD26-002', studentName: 'Lê Minh Tuấn', studentId: '2612002', room: '103 - A1', startDate: '10/09/2026', endDate: '10/09/2027', status: 'expiring' },
    { id: 'HD26-003', studentName: 'Trần Thị Mai', studentId: '2612003', room: '201 - A5', startDate: '12/09/2026', endDate: '12/09/2027', status: 'active' },
    { id: 'HD26-004', studentName: 'Phạm Văn Hùng', studentId: '2612004', room: '106 - A1', startDate: '15/09/2026', endDate: '15/09/2027', status: 'pending_payment' },
    { id: 'HD25-150', studentName: 'Hoàng Bích Ngọc', studentId: '2512005', room: '205 - A5', startDate: '01/09/2025', endDate: '01/09/2026', status: 'liquidated' },
  ];

  // Dữ liệu mẫu cho Hợp đồng Kinh doanh (Nhà xe, căng tin)
  const businessContracts = [
    { id: 'HKD-001', partnerName: 'Công ty TNHH Dịch vụ Vận tải A', service: 'Nhà xe Tòa A1', startDate: '01/01/2026', endDate: '31/12/2028', status: 'active' },
    { id: 'HKD-002', partnerName: 'Hộ KD Căng tin Sinh viên', service: 'Căng tin Tòa A5', startDate: '15/08/2025', endDate: '15/08/2026', status: 'expiring' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="flex items-center w-max px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg border border-green-200"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5"/> Có hiệu lực</span>;
      case 'expiring':
        return <span className="flex items-center w-max px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg border border-orange-200"><Clock className="w-3.5 h-3.5 mr-1.5"/> Sắp hết hạn</span>;
      case 'pending_payment':
        return <span className="flex items-center w-max px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-lg border border-yellow-200"><AlertCircle className="w-3.5 h-3.5 mr-1.5"/> Chờ thanh toán</span>;
      case 'liquidated':
        return <span className="flex items-center w-max px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg border border-gray-200"><FileX className="w-3.5 h-3.5 mr-1.5"/> Đã thanh lý</span>;
      default:
        return null;
    }
  };

  const renderStudentTable = () => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
          <th className="px-6 py-4">Mã Hợp đồng</th>
          <th className="px-6 py-4">Sinh viên</th>
          <th className="px-6 py-4">Phòng</th>
          <th className="px-6 py-4">Thời hạn</th>
          <th className="px-6 py-4">Trạng thái</th>
          <th className="px-6 py-4 text-right">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 text-sm">
        {studentContracts.map((contract) => (
          <tr key={contract.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-6 py-4 font-bold text-blue-600">{contract.id}</td>
            <td className="px-6 py-4">
              <p className="font-semibold text-gray-800">{contract.studentName}</p>
              <p className="text-xs text-gray-500 mt-0.5">MSV: {contract.studentId}</p>
            </td>
            <td className="px-6 py-4 font-medium text-gray-700">{contract.room}</td>
            <td className="px-6 py-4">
              <p className="text-gray-800">{contract.startDate} -</p>
              <p className="text-gray-800 font-medium">{contract.endDate}</p>
            </td>
            <td className="px-6 py-4">{getStatusBadge(contract.status)}</td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors tooltip" title="Xem chi tiết">
                  <Eye className="w-4 h-4" />
                </button>
                {contract.status === 'expiring' && (
                  <button className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors tooltip" title="Gia hạn HĐ">
                    <FilePlus className="w-4 h-4" />
                  </button>
                )}
                {contract.status !== 'liquidated' && (
                  <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors tooltip" title="Thanh lý">
                    <FileX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderBusinessTable = () => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
          <th className="px-6 py-4">Mã Hợp đồng</th>
          <th className="px-6 py-4">Đối tác Kinh doanh</th>
          <th className="px-6 py-4">Dịch vụ mặt bằng</th>
          <th className="px-6 py-4">Thời hạn</th>
          <th className="px-6 py-4">Trạng thái</th>
          <th className="px-6 py-4 text-right">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 text-sm">
        {businessContracts.map((contract) => (
          <tr key={contract.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-6 py-4 font-bold text-blue-600">{contract.id}</td>
            <td className="px-6 py-4 font-semibold text-gray-800">{contract.partnerName}</td>
            <td className="px-6 py-4 font-medium text-gray-700">{contract.service}</td>
            <td className="px-6 py-4">
              <p className="text-gray-800">{contract.startDate} -</p>
              <p className="text-gray-800 font-medium">{contract.endDate}</p>
            </td>
            <td className="px-6 py-4">{getStatusBadge(contract.status)}</td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Xem chi tiết">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Chỉnh sửa">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

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
          <a href="#" className="flex items-center px-4 py-3 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg transition-colors">
            <DoorOpen className="w-5 h-5" />
            <span className="ml-3">Quản lý Phòng & CSVC</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 bg-blue-800 rounded-lg text-white font-medium shadow-inner">
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
          <h2 className="text-xl font-semibold text-gray-800">Quản lý Hợp đồng</h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-auto p-8 flex flex-col">
          
          {/* Tabs & Top Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 border-b border-gray-200 pb-4">
            <div className="flex space-x-6">
              <button 
                onClick={() => setActiveTab('student')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'student' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Hợp đồng Lưu trú (Sinh viên)
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('business')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'business' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" /> Hợp đồng Kinh doanh (Mặt bằng)
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                <Plus className="w-4 h-4" />
                <span>Lập hợp đồng mới</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm mã hợp đồng, tên sinh viên..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white shadow-sm"
              />
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <select className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
                <option>Tất cả trạng thái</option>
                <option>Có hiệu lực</option>
                <option>Sắp hết hạn</option>
                <option>Chờ thanh toán</option>
                <option>Đã thanh lý</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                <Filter className="w-4 h-4" />
                <span>Lọc nâng cao</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              {activeTab === 'student' ? renderStudentTable() : renderBusinessTable()}
            </div>
            
            {/* Pagination */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-gray-50 mt-auto">
              <div>Hiển thị {activeTab === 'student' ? '1 đến 5 trong số 1,150' : '1 đến 2 trong số 2'} hợp đồng</div>
              {activeTab === 'student' && (
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Trước</button>
                  <button className="px-3 py-1 border border-blue-600 bg-blue-50 text-blue-600 rounded font-medium">1</button>
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">2</button>
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">3</button>
                  <span className="px-2">...</span>
                  <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Sau</button>
                </div>
              )}
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
};

export default ContractManagement;
