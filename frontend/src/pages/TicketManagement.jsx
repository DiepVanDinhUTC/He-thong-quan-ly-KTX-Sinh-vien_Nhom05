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
  AlertTriangle,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  ArrowRight,
  MoreVertical,
  AlertCircle,
  Timer,
  HardHat,
  MessageSquare,
  MapPin
} from 'lucide-react';

const TicketManagement = () => {
  const [selectedTicketId, setSelectedTicketId] = useState('TK-2609-02');
  const [searchQuery, setSearchQuery] = useState('');

  // Dữ liệu mẫu (Mock data)
  const tickets = [
    { 
      id: 'TK-2609-01', 
      room: '104 - A1', 
      studentName: 'Phạm Văn Hùng',
      phone: '0904567890',
      issue: 'Hỏng điều hòa (không lên nguồn)', 
      category: 'Điện lạnh',
      status: 'pending', // Chờ tiếp nhận
      priority: 'high',
      createdAt: '29/09/2026 08:30',
      slaHours: 48,
      elapsedHours: 2,
    },
    { 
      id: 'TK-2609-02', 
      room: '205 - A5', 
      studentName: 'Hoàng Bích Ngọc',
      phone: '0905678901',
      issue: 'Tắc bồn cầu nhà vệ sinh', 
      category: 'Nước',
      status: 'processing', // Đang xử lý
      priority: 'medium',
      technician: 'Nguyễn Xuân Thành',
      createdAt: '28/09/2026 14:15',
      slaHours: 24,
      elapsedHours: 26, // Quá SLA
    },
    { 
      id: 'TK-2609-03', 
      room: '102 - A1', 
      studentName: 'Lê Minh Tuấn',
      phone: '0902345678',
      issue: 'Cháy 2 bóng đèn tuýp', 
      category: 'Điện',
      status: 'reviewing', // Chờ nghiệm thu
      priority: 'low',
      technician: 'Phạm Đức Bội',
      createdAt: '28/09/2026 16:00',
      slaHours: 24,
      elapsedHours: 20,
    },
    { 
      id: 'TK-2609-04', 
      room: '301 - A6', 
      studentName: 'Trần Văn C',
      phone: '0987654321',
      issue: 'Gãy bản lề cửa sổ', 
      category: 'Nội thất',
      status: 'completed', // Hoàn thành
      priority: 'low',
      technician: 'Nguyễn Xuân Thành',
      createdAt: '27/09/2026 09:00',
      slaHours: 48,
      elapsedHours: 24,
    },
  ];

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending': return { label: 'Chờ tiếp nhận', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock };
      case 'processing': return { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Wrench };
      case 'reviewing': return { label: 'Chờ nghiệm thu', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: CheckCircle2 };
      case 'completed': return { label: 'Hoàn thành', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 };
      default: return { label: 'Không rõ', color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    }
  };

  const renderSlaBadge = (ticket) => {
    if (ticket.status === 'completed') {
      return <span className="text-xs font-medium text-green-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Đạt SLA</span>;
    }
    if (ticket.elapsedHours > ticket.slaHours) {
      return <span className="text-xs font-medium text-red-600 flex items-center bg-red-50 px-2 py-1 rounded"><AlertTriangle className="w-3 h-3 mr-1"/> Quá hạn {ticket.elapsedHours - ticket.slaHours}h</span>;
    }
    return <span className="text-xs font-medium text-gray-500 flex items-center"><Timer className="w-3 h-3 mr-1"/> Còn {ticket.slaHours - ticket.elapsedHours}h</span>;
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
          <a href="#" className="flex items-center px-4 py-3 bg-blue-800 rounded-lg text-white font-medium shadow-inner border-l-4 border-blue-400">
            <Wrench className="w-5 h-5 text-blue-400" />
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
          <h2 className="text-xl font-semibold text-gray-800">Quản lý Sự cố & Bảo trì (Ticket)</h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
          
          {/* Left Column: Ticket List */}
          <div className="w-full md:w-5/12 lg:w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm theo mã ticket, phòng..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <select className="border border-gray-300 rounded-lg text-xs px-2 py-1.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 flex-1">
                  <option>Tất cả trạng thái</option>
                  <option>Chờ tiếp nhận</option>
                  <option>Đang xử lý</option>
                  <option>Quá hạn SLA</option>
                </select>
                <button className="flex items-center justify-center p-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 bg-white shadow-sm transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tickets.map((ticket) => {
                const statusInfo = getStatusDisplay(ticket.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <div 
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`border rounded-xl p-3 cursor-pointer transition-all ${
                      selectedTicketId === ticket.id ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-500">{ticket.id}</span>
                      {renderSlaBadge(ticket)}
                    </div>
                    
                    <h4 className="font-semibold text-gray-800 text-sm mb-1 truncate">{ticket.issue}</h4>
                    <p className="text-xs text-gray-600 mb-3 flex items-center">
                      <MapPin className="w-3 h-3 mr-1"/> Phòng {ticket.room}
                    </p>
                    
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <span className={`flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] text-gray-400">{ticket.createdAt.split(' ')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Ticket Details */}
          <div className="w-full md:w-7/12 lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {selectedTicket ? (
              <>
                {/* Detail Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{selectedTicket.id}</h3>
                        {(() => {
                          const statusInfo = getStatusDisplay(selectedTicket.status);
                          return (
                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </div>
                      <h2 className="text-lg font-medium text-gray-700">{selectedTicket.issue}</h2>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <Building className="w-4 h-4 mr-2 text-blue-600" />
                      Phòng: <span className="font-semibold text-gray-800 ml-1">{selectedTicket.room}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <Wrench className="w-4 h-4 mr-2 text-orange-600" />
                      Nhóm lỗi: <span className="font-semibold text-gray-800 ml-1">{selectedTicket.category}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      Gửi lúc: <span className="font-semibold text-gray-800 ml-1">{selectedTicket.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Reporter Info & Description */}
                  <div className="p-6 border-b border-gray-100">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Thông tin báo cáo</h4>
                    
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-blue-200 text-blue-600">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{selectedTicket.studentName}</p>
                          <p className="text-sm text-gray-600">SĐT: {selectedTicket.phone}</p>
                        </div>
                        <button className="ml-auto flex items-center justify-center px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                          <MessageSquare className="w-4 h-4 mr-1.5" /> Chat
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 font-medium mb-2">Mô tả chi tiết:</p>
                      <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        Bồn cầu bị tắc từ tối qua, nước không thoát được và có mùi hôi. Mong ban quản lý xử lý sớm giúp phòng em ạ.
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-2 flex items-center">
                        <ImageIcon className="w-4 h-4 mr-1.5" /> Hình ảnh đính kèm (1)
                      </p>
                      <div className="flex gap-2">
                        <div className="w-24 h-24 bg-gray-200 rounded-lg border border-gray-300 flex items-center justify-center text-gray-400 overflow-hidden cursor-pointer hover:opacity-90">
                          {/* Placeholder cho ảnh thực tế */}
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Processing & Assignment */}
                  <div className="p-6 bg-gray-50">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Xử lý & Phân công</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Kỹ thuật viên phụ trách</label>
                        {selectedTicket.technician ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-800 flex items-center">
                              <HardHat className="w-4 h-4 text-orange-500 mr-1.5" />
                              {selectedTicket.technician}
                            </span>
                            <button className="text-xs text-blue-600 hover:underline">Đổi</button>
                          </div>
                        ) : (
                          <select className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Chọn kỹ thuật viên --</option>
                            <option value="1">Nguyễn Xuân Thành</option>
                            <option value="2">Phạm Đức Bội</option>
                          </select>
                        )}
                      </div>

                      <div className={`p-4 rounded-xl border shadow-sm ${selectedTicket.elapsedHours > selectedTicket.slaHours ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex justify-between">
                          Cam kết thời gian (SLA)
                          <span className="font-bold text-gray-700">{selectedTicket.slaHours}h</span>
                        </label>
                        {selectedTicket.elapsedHours > selectedTicket.slaHours ? (
                          <p className="text-sm font-bold text-red-600 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1.5" /> Quá hạn {selectedTicket.elapsedHours - selectedTicket.slaHours} tiếng
                          </p>
                        ) : (
                          <p className="text-sm font-bold text-green-600 flex items-center">
                            <Timer className="w-4 h-4 mr-1.5" /> Còn {selectedTicket.slaHours - selectedTicket.elapsedHours} tiếng
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors bg-white">
                        Phạt đền bù (Lỗi SV)
                      </button>
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors flex items-center">
                        Cập nhật trạng thái <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
                <Wrench className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-center font-medium">Chọn một ticket từ danh sách để xem chi tiết và xử lý.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TicketManagement;
