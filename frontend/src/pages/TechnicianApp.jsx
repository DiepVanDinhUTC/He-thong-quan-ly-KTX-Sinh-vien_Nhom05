import React, { useState } from 'react';
import { 
  Bell, 
  User, 
  Wrench, 
  Clock, 
  MapPin, 
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ImageIcon,
  Settings,
  HardHat,
  Info,
  Check,
  Filter
} from 'lucide-react';

const TechnicianApp = () => {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'detail' | 'success'
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // States cho Form báo cáo sửa chữa
  const [rootCause, setRootCause] = useState('hao_mon'); // 'hao_mon' | 'loi_sv'
  const [materials, setMaterials] = useState('');

  // Dữ liệu mẫu Tickets
  const [tickets] = useState([
    {
      id: 'TK-2609-05',
      room: '102',
      building: 'A5',
      issue: 'Cháy 2 bóng đèn tuýp nhà vệ sinh',
      category: 'Điện',
      status: 'processing',
      slaWarning: true,
      timeLeft: 'Quá hạn 5h',
      description: 'Đèn chớp liên tục rồi tắt hẳn, hai đầu bóng bị đen.',
      studentName: 'Trần Văn C',
      phone: '0987654321',
      images: 1
    },
    {
      id: 'TK-2609-02',
      room: '417',
      building: 'A1',
      issue: 'Hỏng điều hòa (Không mát)',
      category: 'Điện lạnh',
      status: 'processing',
      slaWarning: true,
      timeLeft: 'Còn 2h',
      description: 'Bật 16 độ nhưng chỉ có gió thổi, không có hơi lạnh. Quạt gió cục nóng bên ngoài kêu rất to.',
      studentName: 'Nguyễn Hoàng Dũng',
      phone: '0901234567',
      images: 2
    },
    {
      id: 'TK-2609-08',
      room: '304',
      building: 'A1',
      issue: 'Gãy bản lề tủ quần áo',
      category: 'Nội thất',
      status: 'processing',
      slaWarning: false,
      timeLeft: 'Còn 22h',
      description: 'Tủ của giường số 3 bị bung bản lề không đóng lại được.',
      studentName: 'Lê Minh Tuấn',
      phone: '0902345678',
      images: 1
    }
  ]);

  const handleOpenTicket = (ticket) => {
    setSelectedTicket(ticket);
    setCurrentScreen('detail');
    // Reset form
    setRootCause('hao_mon');
    setMaterials('');
  };

  const handleSubmitRepair = () => {
    setCurrentScreen('success');
  };

  return (
    // Sử dụng max-w-md và mx-auto để giả lập màn hình Mobile trên trình duyệt
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col font-sans relative overflow-hidden shadow-2xl border-x border-gray-200">
      
      {/* ======================================================== */}
      {/* SCREEN 1: HOME (Danh sách công việc) */}
      {/* ======================================================== */}
      <div className={`flex flex-col h-full absolute inset-0 transition-transform duration-300 ${currentScreen === 'home' ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <header className="bg-blue-900 text-white px-5 pt-12 pb-5 rounded-b-3xl shadow-md z-10 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-800 rounded-full flex items-center justify-center border-2 border-blue-700">
                <HardHat className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-0.5">Kỹ thuật viên</p>
                <h1 className="text-lg font-bold">Nguyễn Xuân Thành</h1>
              </div>
            </div>
            <button className="relative p-2 bg-blue-800 rounded-full hover:bg-blue-700 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-800 animate-pulse"></span>
            </button>
          </div>

          {/* SLA Dashboard Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-800/50 backdrop-blur-sm border border-blue-700/50 rounded-2xl p-4 flex flex-col justify-center">
              <p className="text-blue-200 text-xs font-medium mb-1">Đang xử lý</p>
              <p className="text-3xl font-black">3 <span className="text-sm font-medium text-blue-300 ml-1">ticket</span></p>
            </div>
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-20">
                <AlertTriangle className="w-16 h-16 text-red-400" />
              </div>
              <p className="text-red-200 text-xs font-medium mb-1">Cảnh báo SLA</p>
              <p className="text-3xl font-black text-white">2 <span className="text-sm font-medium text-red-200 ml-1">trễ hạn</span></p>
            </div>
          </div>
        </header>

        {/* Task List */}
        <main className="flex-1 overflow-y-auto p-5 pb-8 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-gray-800 text-lg">Danh sách công việc</h2>
            <button className="text-blue-600 text-sm font-semibold flex items-center">
              Lọc <Filter className="w-4 h-4 ml-1" />
            </button>
          </div>

          {tickets.map((ticket) => (
            <div 
              key={ticket.id}
              onClick={() => handleOpenTicket(ticket)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer relative overflow-hidden group"
            >
              {/* Thanh màu chỉ thị mức độ ưu tiên bên trái */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ticket.timeLeft.includes('Quá hạn') ? 'bg-red-500' : ticket.timeLeft.includes('Còn 2h') ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
              
              <div className="flex justify-between items-start mb-3 pl-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">{ticket.id}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {ticket.category}
                  </span>
                </div>
                
                {/* Countdown SLA Timer */}
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-md ${
                  ticket.timeLeft.includes('Quá hạn') 
                    ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' 
                    : ticket.timeLeft.includes('Còn 2h')
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  <Clock className="w-3 h-3 mr-1" /> {ticket.timeLeft}
                </div>
              </div>

              <div className="pl-2">
                <h3 className="font-bold text-gray-900 mb-2 leading-tight pr-6">{ticket.issue}</h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-blue-600" />
                    P.{ticket.room} - Tòa {ticket.building}
                  </div>
                  {ticket.images > 0 && (
                    <div className="flex items-center">
                      <ImageIcon className="w-4 h-4 mr-1 text-gray-400" />
                      {ticket.images} ảnh
                    </div>
                  )}
                </div>
              </div>

              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
            </div>
          ))}
        </main>
      </div>

      {/* ======================================================== */}
      {/* SCREEN 2: TICKET DETAIL & ACTION */}
      {/* ======================================================== */}
      <div className={`flex flex-col h-full absolute inset-0 bg-gray-50 transition-transform duration-300 ${currentScreen === 'detail' ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header Back */}
        <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-200 flex items-center gap-4 shrink-0 z-10 sticky top-0">
          <button 
            onClick={() => setCurrentScreen('home')}
            className="p-2 -ml-2 bg-gray-100 text-gray-600 rounded-full active:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-gray-900 leading-none">Chi tiết sự cố</h2>
            <p className="text-xs font-medium text-gray-500 mt-1">{selectedTicket?.id}</p>
          </div>
        </header>

        {selectedTicket && (
          <main className="flex-1 overflow-y-auto pb-32"> {/* padding-bottom lớn để nhường chỗ cho nút Action cố định */}
            
            {/* Info Section */}
            <div className="bg-white p-5 mb-2 border-b border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-100">
                  <MapPin className="w-4 h-4" />
                  <span className="font-bold text-sm">Phòng {selectedTicket.room} - Tòa {selectedTicket.building}</span>
                </div>
                {selectedTicket.timeLeft.includes('Quá hạn') && (
                  <span className="text-xs font-bold text-red-600 flex items-center bg-red-50 px-2 py-1 rounded border border-red-100">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Quá hạn SLA
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedTicket.issue}</h3>
              
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                <p className="text-sm text-gray-600 italic">"{selectedTicket.description}"</p>
              </div>

              {/* Hình ảnh đính kèm */}
              <p className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                <ImageIcon className="w-4 h-4 mr-1.5" /> Hình ảnh hiện trạng
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {[...Array(selectedTicket.images)].map((_, i) => (
                  <div key={i} className="w-24 h-24 bg-gray-200 rounded-xl shrink-0 flex items-center justify-center border border-gray-300">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Form báo cáo (Technician Input) */}
            <div className="p-5 space-y-6">
              <h3 className="font-bold text-gray-800 text-lg border-l-4 border-blue-600 pl-3">Báo cáo sửa chữa</h3>
              
              {/* Xác định nguyên nhân */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                  Xác định nguyên nhân hỏng
                  <Info className="w-4 h-4 text-gray-400" />
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-start p-4 rounded-2xl border-2 transition-colors ${rootCause === 'hao_mon' ? 'border-green-500 bg-green-50/50' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 mr-3 flex items-center justify-center shrink-0 ${rootCause === 'hao_mon' ? 'border-green-500' : 'border-gray-300'}`}>
                      {rootCause === 'hao_mon' && <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${rootCause === 'hao_mon' ? 'text-green-800' : 'text-gray-800'}`}>Hao mòn tự nhiên / Hết hạn</p>
                      <p className="text-xs text-gray-500 mt-1">Sự cố do chất lượng thiết bị, trường chịu phí thay thế.</p>
                    </div>
                    <input type="radio" name="cause" value="hao_mon" className="hidden" checked={rootCause === 'hao_mon'} onChange={() => setRootCause('hao_mon')} />
                  </label>

                  <label className={`flex items-start p-4 rounded-2xl border-2 transition-colors ${rootCause === 'loi_sv' ? 'border-red-500 bg-red-50/50' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 mr-3 flex items-center justify-center shrink-0 ${rootCause === 'loi_sv' ? 'border-red-500' : 'border-gray-300'}`}>
                      {rootCause === 'loi_sv' && <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${rootCause === 'loi_sv' ? 'text-red-800' : 'text-gray-800'}`}>Lỗi do sinh viên (Phá hoại/Cố ý)</p>
                      <p className="text-xs text-gray-500 mt-1">Làm căn cứ để Kế toán lập biên bản thu phí đền bù tài sản.</p>
                    </div>
                    <input type="radio" name="cause" value="loi_sv" className="hidden" checked={rootCause === 'loi_sv'} onChange={() => setRootCause('loi_sv')} />
                  </label>
                </div>
              </div>

              {/* Nhập vật tư */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Vật tư thay thế (Nếu có)
                </label>
                <textarea 
                  rows="2"
                  placeholder="Nhập tên vật tư đã sử dụng (VD: 2 bóng đèn tuýp 1.2m, 1 cuộn băng dính điện...)" 
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm resize-none"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                ></textarea>
              </div>
            </div>
          </main>
        )}

        {/* Bottom Sticky Action Bar (Giao diện mobile-first tối ưu chạm) */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20">
          <button 
            onClick={handleSubmitRepair}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg active:bg-blue-800 active:scale-[0.98] transition-all flex items-center justify-center shadow-lg shadow-blue-600/30"
          >
            <CheckCircle2 className="w-6 h-6 mr-2" /> XÁC NHẬN ĐÃ SỬA XONG
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SCREEN 3: SUCCESS (Màn hình thành công) */}
      {/* ======================================================== */}
      <div className={`flex flex-col h-full absolute inset-0 bg-white transition-transform duration-500 z-50 justify-center p-6 ${currentScreen === 'success' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Xác nhận thành công!</h2>
          <p className="text-gray-500 mb-8 text-sm">
            Hệ thống đã cập nhật trạng thái Ticket sang <strong className="text-gray-800">"Chờ nghiệm thu"</strong>. Sinh viên sẽ nhận được thông báo để kiểm tra và xác nhận đóng ticket.
          </p>
          
          <button 
            onClick={() => setCurrentScreen('home')}
            className="w-full py-4 bg-gray-100 text-gray-800 rounded-2xl font-bold text-base hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            Quay về Danh sách
          </button>
        </div>
      </div>

    </div>
  );
};

export default TechnicianApp;
