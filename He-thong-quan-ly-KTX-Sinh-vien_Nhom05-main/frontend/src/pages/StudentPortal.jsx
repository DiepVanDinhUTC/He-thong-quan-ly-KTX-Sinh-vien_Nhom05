import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Bell,
  QrCode,
  Wrench,
  DoorOpen,
  Calendar,
  Users,
  Zap,
  Droplets,
  CheckCircle2,
  Clock,
  ChevronRight,
  Home,
  ShieldCheck,
  CreditCard,
  History,
  AlertTriangle,
  LogOut
} from 'lucide-react';

const StudentPortal = () => {
  const navigate = useNavigate(); // Khai báo hook điều hướng

  // ĐÃ SỬA: Chuyển hướng sang trang đăng nhập thực tế (Ví dụ: '/login' hoặc '/dang-nhap')
  const handleLogout = () => {
    navigate('/login'); // Hãy đổi thành '/dang-nhap' nếu route trang login của bạn tên là thế
  };

  const student = {
    name: 'Nguyễn Thanh Tùng',
    id: '2612001',
    avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thanh+Tùng&background=1e3a8a&color=fff',
    room: '101',
    building: 'Tòa A1',
    contractEnd: '05/09/2027',
  };

  const roommates = [
    { name: 'Lê Minh Tuấn', id: '2612002', avatar: 'https://ui-avatars.com/api/?name=Lê+Minh+Tuấn&background=e2e8f0&color=475569' },
    { name: 'Trần Văn Hoàng', id: '2612045', avatar: 'https://ui-avatars.com/api/?name=Trần+Văn+Hoàng&background=e2e8f0&color=475569' },
    { name: 'Phạm Đức Anh', id: '2612088', avatar: 'https://ui-avatars.com/api/?name=Phạm+Đức+Anh&background=e2e8f0&color=475569' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-800 font-sans pb-10">
      
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center shadow-sm">
              <Building className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-blue-900 tracking-tight hidden sm:block">KTX GTVT</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <img src={student.avatar} alt="Avatar" className="w-9 h-9 rounded-full shadow-sm border border-gray-200" />
              <div className="hidden md:block">
                <p className="text-sm font-bold text-gray-800 leading-none">{student.name}</p>
                <p className="text-xs text-gray-500 mt-1">{student.id}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Chào buổi sáng, Tùng! 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Chúc bạn một ngày học tập hiệu quả.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <button 
                onClick={() => navigate('/room-registration')}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow gap-3 group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <DoorOpen className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-700 text-center">Đăng ký /<br/>Trả phòng</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow gap-3 group">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <QrCode className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-700 text-center">Thanh toán<br/>Hóa đơn QR</span>
              </button>

              <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow gap-3 group">
                <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Wrench className="w-6 h-6" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-700 text-center">Gửi Ticket<br/>Báo hỏng</span>
              </button>
            </div>

            {/* Billing Section */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
              
              <div className="p-5 sm:p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg flex items-center">
                  <CreditCard className="w-5 h-5 text-blue-600 mr-2" /> Hóa đơn Tháng 09/2026
                </h3>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold uppercase tracking-wider rounded-full flex items-center">
                  <Clock className="w-3 h-3 mr-1" /> Chờ thanh toán
                </span>
              </div>
              
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1 w-full space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-600 text-sm">
                      <Home className="w-4 h-4 mr-2 text-gray-400" /> Tiền phòng (Tháng 9)
                    </div>
                    <span className="font-semibold text-gray-800">200.000 đ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-600 text-sm">
                      <Zap className="w-4 h-4 mr-2 text-yellow-500" /> Điện (45 kWh)
                    </div>
                    <span className="font-semibold text-gray-800">112.500 đ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-600 text-sm">
                      <Droplets className="w-4 h-4 mr-2 text-blue-400" /> Nước (4 Khối)
                    </div>
                    <span className="font-semibold text-gray-800">40.000 đ</span>
                  </div>
                  
                  <div className="pt-4 border-t border-dashed border-gray-200 flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Tổng cộng</span>
                    <span className="text-2xl font-bold text-blue-700">352.500 đ</span>
                  </div>
                </div>

                <div className="w-full sm:w-auto bg-gray-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                  <div className="w-32 h-32 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center p-2 mb-3">
                    <QrCode className="w-full h-full text-blue-900" />
                  </div>
                  <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center">
                    Mở app VNPAY
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Mã QR động tự động gạch nợ</p>
                </div>
              </div>
            </div>

            {/* Ticket Tracking */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg flex items-center">
                  <History className="w-5 h-5 text-orange-500 mr-2" /> Tiến độ sửa chữa (Ticket)
                </h3>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                  Xem tất cả <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-5 sm:p-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800">TK-2609-02: Tắc bồn cầu nhà vệ sinh</h4>
                  <p className="text-xs text-gray-500 mt-1">Kỹ thuật viên: Nguyễn Xuân Thành</p>
                </div>

                <div className="relative pl-3 space-y-6 before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-gray-800 text-sm">Đã gửi yêu cầu</div>
                        <time className="text-xs font-medium text-gray-500">T2, 08:30</time>
                      </div>
                      <div className="text-xs text-gray-500">Bạn đã gửi hình ảnh đính kèm hiện trạng.</div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl bg-gray-50 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-gray-800 text-sm">Đang sửa chữa</div>
                        <time className="text-xs font-medium text-gray-500">T2, 14:15</time>
                      </div>
                      <div className="text-xs text-gray-500">KTV Thành đang có mặt tại phòng xử lý.</div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-blue-200 bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 animate-pulse">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl bg-blue-50 border border-blue-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-blue-800 text-sm">Chờ nghiệm thu</div>
                        <time className="text-xs font-medium text-blue-600">Vừa xong</time>
                      </div>
                      <div className="text-xs text-gray-600 mb-3">KTV báo cáo đã sửa xong. Vui lòng kiểm tra và xác nhận.</div>
                      <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">
                        Bấm nghiệm thu & Đánh giá
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-blue-900 p-6 text-center text-white relative">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                <ShieldCheck className="w-10 h-10 mx-auto text-blue-300 mb-2 relative z-10" />
                <h3 className="text-2xl font-black tracking-tight relative z-10">Phòng {student.room}</h3>
                <p className="text-blue-200 font-medium relative z-10">{student.building}</p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-50">
                  <div className="flex items-center text-gray-500 text-sm">
                    <Calendar className="w-4 h-4 mr-2" /> Hạn hợp đồng
                  </div>
                  <span className="font-semibold text-gray-800">{student.contractEnd}</span>
                </div>
                
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-gray-500 text-sm">
                      <Users className="w-4 h-4 mr-2" /> Bạn cùng phòng
                    </div>
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">4/8 SV</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <img src={student.avatar} alt="Me" className="w-8 h-8 rounded-full border border-gray-200" />
                        <span className="text-sm font-bold text-blue-800">Bạn (Trưởng phòng)</span>
                      </div>
                    </div>
                    {roommates.map((mate, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={mate.avatar} alt={mate.name} className="w-8 h-8 rounded-full border border-gray-200" />
                          <div>
                            <span className="text-sm font-medium text-gray-800 block">{mate.name}</span>
                            <span className="text-xs text-gray-400 block">{mate.id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
              <button 
                onClick={handleLogout} 
                className="w-full flex items-center justify-center p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold text-sm"
              >
                <LogOut className="w-5 h-5 mr-2" /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;