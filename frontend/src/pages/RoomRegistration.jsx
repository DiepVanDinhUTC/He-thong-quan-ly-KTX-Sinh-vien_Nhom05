import React, { useState } from 'react';
import { 
  Building, 
  ArrowLeft,
  Wind,
  CheckCircle2,
  ChevronRight,
  CalendarDays,
  ShieldCheck,
  Check,
  CreditCard,
  User
} from 'lucide-react';

const RoomRegistration = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    building: '',
    roomType: '',
    duration: '12',
  });

  // Mock data profile
  const student = {
    name: 'Nguyễn Thanh Tùng',
    id: '2612001',
    dob: '15/05/2005',
    gender: 'Nam',
    khoa: 'Công nghệ thông tin'
  };

  const handleNextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitRegistration = () => {
    // Giả lập gửi form thành công
    setStep(4);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Đăng ký nội trú KTX</h1>
          </div>
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center shadow-sm hidden sm:flex">
            <Building className="w-4 h-4 text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        
        {/* Progress Tracker */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500`} style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
              
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-gray-50 transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-gray-50 transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-gray-50 transition-colors ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-gray-500 px-1">
              <span className={step >= 1 ? 'text-blue-700' : ''}>Loại phòng</span>
              <span className={step >= 2 ? 'text-blue-700' : ''}>Thời gian</span>
              <span className={step >= 3 ? 'text-blue-700' : ''}>Xác nhận</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* STEP 1: CHỌN LOẠI PHÒNG */}
          {step === 1 && (
            <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Chọn khu vực và loại phòng</h2>
              <p className="text-sm text-gray-500 mb-6">Chọn tiêu chuẩn phòng mà bạn muốn đăng ký lưu trú trong kỳ tới.</p>
              
              <div className="space-y-4">
                {/* Lựa chọn 1 */}
                <div 
                  onClick={() => setFormData({...formData, building: 'A1', roomType: 'Điều hòa'})}
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.roomType === 'Điều hòa' ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                  }`}
                >
                  {formData.roomType === 'Điều hòa' && <div className="absolute top-4 right-4 text-blue-600"><CheckCircle2 className="w-6 h-6" /></div>}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${formData.roomType === 'Điều hòa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Wind className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">Phòng Điều hòa (Tòa A1)</h3>
                      <p className="text-sm text-gray-500 mt-1">Sức chứa: 8 Sinh viên / phòng. Trang bị đầy đủ điều hòa, bình nóng lạnh, tủ cá nhân.</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">200.000 đ/tháng</span>
                        <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-md">Còn chỗ</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lựa chọn 2 */}
                <div 
                  onClick={() => setFormData({...formData, building: 'A5', roomType: 'Quạt'})}
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.roomType === 'Quạt' ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                  }`}
                >
                  {formData.roomType === 'Quạt' && <div className="absolute top-4 right-4 text-blue-600"><CheckCircle2 className="w-6 h-6" /></div>}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${formData.roomType === 'Quạt' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 0 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 0-7.002 8.618l1.45-5.412Z"/><path d="M12 12v.01"/></svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">Phòng Quạt Trần (Tòa A5)</h3>
                      <p className="text-sm text-gray-500 mt-1">Sức chứa: 8 Sinh viên / phòng. Trang bị quạt trần, bình nóng lạnh, khu vực phơi đồ rộng.</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">120.000 đ/tháng</span>
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-md">Sắp hết</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleNextStep} 
                  disabled={!formData.roomType}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                >
                  Tiếp tục <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: THỜI GIAN */}
          {step === 2 && (
            <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Thời gian lưu trú</h2>
              <p className="text-sm text-gray-500 mb-6">Bạn dự kiến sẽ ở tại ký túc xá trong thời gian bao lâu?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.duration === '12' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}>
                  <div className="flex items-center gap-3">
                    <CalendarDays className={`w-6 h-6 ${formData.duration === '12' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-bold text-gray-800">1 Năm học (10 tháng)</p>
                      <p className="text-xs text-gray-500">Tháng 9/2026 - Tháng 6/2027</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.duration === '12' ? 'border-blue-600' : 'border-gray-300'}`}>
                    {formData.duration === '12' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                  </div>
                  <input type="radio" name="duration" value="12" className="hidden" checked={formData.duration === '12'} onChange={(e) => setFormData({...formData, duration: e.target.value})} />
                </label>

                <label className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.duration === '6' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}>
                  <div className="flex items-center gap-3">
                    <CalendarDays className={`w-6 h-6 ${formData.duration === '6' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-bold text-gray-800">1 Học kỳ (5 tháng)</p>
                      <p className="text-xs text-gray-500">Tháng 9/2026 - Tháng 1/2027</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.duration === '6' ? 'border-blue-600' : 'border-gray-300'}`}>
                    {formData.duration === '6' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                  </div>
                  <input type="radio" name="duration" value="6" className="hidden" checked={formData.duration === '6'} onChange={(e) => setFormData({...formData, duration: e.target.value})} />
                </label>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={handlePrevStep} 
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors sm:w-auto"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleNextStep} 
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Tiếp tục <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: XÁC NHẬN */}
          {step === 3 && (
            <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><ShieldCheck className="w-6 h-6 mr-2 text-blue-600"/> Xác nhận thông tin</h2>
              
              <div className="space-y-6">
                
                {/* Info Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center"><User className="w-4 h-4 mr-1.5"/> Thông tin Sinh viên (Tự động điền)</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Họ và tên</p>
                      <p className="font-semibold text-gray-800">{student.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Mã sinh viên</p>
                      <p className="font-semibold text-gray-800">{student.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Ngày sinh</p>
                      <p className="font-medium text-gray-800">{student.dob}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Lớp/Khoa</p>
                      <p className="font-medium text-gray-800">{student.khoa}</p>
                    </div>
                  </div>
                </div>

                {/* Registration Details */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center"><Building className="w-4 h-4 mr-1.5"/> Chi tiết Đăng ký</h3>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600 text-sm">Loại phòng:</span>
                    <span className="font-bold text-gray-800">{formData.roomType} (Tòa {formData.building})</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600 text-sm">Đơn giá:</span>
                    <span className="font-semibold text-gray-800">{formData.roomType === 'Điều hòa' ? '200.000' : '120.000'} đ/tháng</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600 text-sm">Thời gian:</span>
                    <span className="font-semibold text-gray-800">{formData.duration === '12' ? '1 Năm học (10 tháng)' : '1 Học kỳ (5 tháng)'}</span>
                  </div>
                  
                  <div className="pt-4 border-t border-blue-200/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 text-sm">Tạm tính phí phòng:</span>
                      <span className="font-medium text-gray-800">
                        {formData.roomType === 'Điều hòa' 
                          ? (200000 * parseInt(formData.duration === '12' ? 10 : 5)).toLocaleString() 
                          : (120000 * parseInt(formData.duration === '12' ? 10 : 5)).toLocaleString()} đ
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Tiền cọc CSVC:</span>
                      <span className="font-medium text-gray-800">200.000 đ</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={handlePrevStep} 
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors sm:w-auto"
                >
                  Sửa lại
                </button>
                <button 
                  onClick={submitRegistration} 
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                  <Check className="w-5 h-5" /> Gửi đơn đăng ký
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="p-8 sm:p-12 text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Đăng ký thành công!</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Đơn đăng ký nguyện vọng nội trú của bạn đã được gửi đến Ban quản lý. Vui lòng theo dõi email hoặc mục thông báo trên Cổng sinh viên để nhận kết quả xếp phòng.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left max-w-sm mx-auto mb-8">
                <p className="text-sm text-gray-600 mb-1">Mã đơn đăng ký:</p>
                <p className="font-bold text-gray-800 text-lg tracking-wider">DK26-A1092</p>
              </div>

              <button 
                onClick={() => window.location.reload()} 
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Về trang chủ
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default RoomRegistration;
