import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  Zap,
  Droplets,
  Home,
  Wrench,
  ChevronRight,
  QrCode,
  Download,
  Smartphone,
  Wallet,
  Building
} from 'lucide-react';

const BillPayment = () => {
  const [activeTab, setActiveTab] = useState('unpaid');
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'qr' | 'success'
  const [timeLeft, setTimeLeft] = useState(600); // 10 phút đếm ngược cho QR

  // Mockup đếm ngược QR code
  useEffect(() => {
    if (paymentStep === 'qr' && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timerId);
    } else if (timeLeft === 0) {
      setPaymentStep('select');
      setTimeLeft(600);
      alert('Mã QR đã hết hạn, vui lòng tạo lại!');
    }
  }, [paymentStep, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSimulatePayment = () => {
    // Giả lập Webhook trả về từ VNPAY thành công
    setPaymentStep('success');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (paymentStep === 'qr') setPaymentStep('select');
                else if (paymentStep === 'success') { setPaymentStep('select'); setActiveTab('history'); }
              }}
              className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Thanh toán phí KTX</h1>
          </div>
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shadow-sm hidden sm:flex">
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 mt-6">
        
        {paymentStep === 'select' && (
          <>
            {/* Tabs */}
            <div className="flex bg-gray-200/50 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setActiveTab('unpaid')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'unpaid' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <AlertCircle className="w-4 h-4" /> Cần thanh toán (1)
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <History className="w-4 h-4" /> Lịch sử
              </button>
            </div>

            {activeTab === 'unpaid' ? (
              <div className="space-y-6">
                
                {/* Bill Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
                  
                  <div className="p-5 sm:p-6 border-b border-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 text-lg">Hóa đơn Tháng 09/2026</h3>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                        Chờ thanh toán
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Mã HĐ: HD-2609-101A1 &bull; Hạn: 15/10/2026</p>
                  </div>
                  
                  <div className="p-5 sm:p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Home className="w-4 h-4 mr-3 text-gray-400" /> 
                          Phí lưu trú (P.101 - A1)
                        </div>
                        <span className="font-medium text-gray-800">200.000 đ</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Zap className="w-4 h-4 mr-3 text-yellow-500" /> 
                          Điện năng (Chỉ số: 120 - 165)
                        </div>
                        <span className="font-medium text-gray-800">112.500 đ</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Droplets className="w-4 h-4 mr-3 text-blue-400" /> 
                          Nước sinh hoạt (4 khối)
                        </div>
                        <span className="font-medium text-gray-800">40.000 đ</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Wrench className="w-4 h-4 mr-3 text-red-400" /> 
                          Phạt đền bù (TK-2609-02)
                        </div>
                        <span className="font-medium text-red-600">50.000 đ</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-dashed border-gray-200 flex justify-between items-end">
                      <div>
                        <p className="text-gray-500 text-sm font-medium mb-1">Tổng thanh toán</p>
                        <p className="text-xs text-blue-600">Đã bao gồm VAT</p>
                      </div>
                      <span className="text-2xl font-bold text-blue-700">402.500 đ</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 px-1">Phương thức thanh toán</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-white border-2 border-blue-600 rounded-2xl cursor-pointer shadow-sm relative">
                      <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-bl-lg rounded-tr-xl">Khuyên dùng</div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <QrCode className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">Quét mã VNPAY-QR</p>
                          <p className="text-xs text-gray-500">Tự động gạch nợ ngay lập tức</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-4 border-blue-600"></div>
                    </label>

                    <label className="flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-2xl cursor-pointer hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">Ví điện tử Momo</p>
                          <p className="text-xs text-gray-500">Mở app để thanh toán</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={() => setPaymentStep('qr')}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 mt-8 flex items-center justify-center gap-2"
                >
                  Thanh toán 402.500 đ <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              /* Lịch sử thanh toán */
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">Hóa đơn Tháng 08/2026</p>
                      <p className="text-xs text-gray-500 mt-0.5">Thanh toán lúc 10:15 - 12/09/2026</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 mb-1">365.000 đ</p>
                    <button className="text-xs font-semibold text-blue-600 flex items-center justify-end hover:underline">
                      <Download className="w-3 h-3 mr-1" /> Biên lai
                    </button>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">Phí Đăng ký Lưu trú KTX</p>
                      <p className="text-xs text-gray-500 mt-0.5">Thanh toán qua VNPAY</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 mb-1">1.200.000 đ</p>
                    <button className="text-xs font-semibold text-blue-600 flex items-center justify-end hover:underline">
                      <Download className="w-3 h-3 mr-1" /> Biên lai
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Màn hình hiển thị QR Code */}
        {paymentStep === 'qr' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <div className="p-6 sm:p-8 flex flex-col items-center text-center">
              
              <div className="w-full flex justify-between items-center mb-6">
                <span className="text-sm font-semibold text-gray-500">Mã đơn: HD-2609-101A1</span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" /> {formatTime(timeLeft)}
                </span>
              </div>

              <div className="bg-blue-900 w-full p-4 rounded-2xl text-white mb-6">
                <p className="text-sm text-blue-200 mb-1">Số tiền thanh toán</p>
                <p className="text-3xl font-bold">402.500 VND</p>
              </div>

              <div className="p-4 bg-white border-2 border-blue-600 rounded-3xl shadow-lg mb-6 relative">
                {/* Giả lập hình ảnh QR */}
                <QrCode className="w-48 h-48 sm:w-56 sm:h-56 text-blue-900" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center">
                    <span className="font-black text-blue-600 text-xs">VNPAY</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl text-left mb-8 w-full border border-gray-100">
                <Smartphone className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  Mở ứng dụng ngân hàng hoặc ví điện tử hỗ trợ VNPAY-QR để quét mã. <br/>
                  <strong className="text-gray-800">Không cần nhập số tiền và nội dung.</strong>
                </p>
              </div>

              {/* Nút giả lập (Dành cho bản demo) */}
              <button 
                onClick={handleSimulatePayment}
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                (Demo) Giả lập khách đã quét mã thành công
              </button>

            </div>
          </div>
        )}

        {/* Màn hình thành công */}
        {paymentStep === 'success' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 sm:p-12 text-center animate-in zoom-in duration-500 mt-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-20"></div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thanh toán thành công!</h2>
            <p className="text-2xl font-bold text-blue-600 mb-6">402.500 đ</p>
            
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              Hệ thống đã tự động gạch nợ hóa đơn <strong className="text-gray-700">Tháng 09/2026</strong> của bạn. Cảm ơn bạn đã đóng phí đúng hạn.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left max-w-xs mx-auto space-y-2 border border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mã giao dịch:</span>
                <span className="font-semibold text-gray-800">VN260999124</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Thời gian:</span>
                <span className="font-medium text-gray-800">10:45 - 29/09/2026</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setPaymentStep('select');
                setActiveTab('history');
              }} 
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Xem biên lai
            </button>
          </div>
        )}
        
      </main>
    </div>
  );
};

export default BillPayment;
