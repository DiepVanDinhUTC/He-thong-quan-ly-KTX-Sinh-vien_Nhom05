import React, { useState } from 'react';
import { 
  ArrowLeft,
  Wrench,
  Image as ImageIcon,
  Zap,
  Droplets,
  Wind,
  Bed,
  CheckCircle2,
  X,
  UploadCloud,
  MapPin,
  AlertCircle
} from 'lucide-react';

const TicketReport = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
  });

  const categories = [
    { id: 'dien', name: 'Điện', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { id: 'nuoc', name: 'Nước', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'dieu-hoa', name: 'Làm mát', icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    { id: 'noi-that', name: 'Nội thất', icon: Bed, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  ];

  // Giả lập chọn ảnh
  const handleImageAdd = () => {
    if (images.length < 3) {
      setImages([...images, 'blob:preview-' + Date.now()]);
    }
  };

  const handleImageRemove = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate cơ bản (Bắt buộc phải có ảnh theo yêu cầu dự án)
    if (images.length === 0) {
      alert("Vui lòng đính kèm ít nhất 1 hình ảnh hiện trạng!");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Báo hỏng cơ sở vật chất</h1>
          </div>
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shadow-sm hidden sm:flex">
            <Wrench className="w-4 h-4 text-orange-600" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 mt-6">
        
        {!isSubmitted ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8">
              
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-8">
                <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Vị trí cần sửa chữa:</p>
                  <p className="font-bold text-blue-900">Phòng 101 - Tòa A1 (Phòng của bạn)</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Phân loại */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Phân loại sự cố <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.id;
                      return (
                        <div 
                          key={cat.id}
                          onClick={() => setFormData({...formData, category: cat.id})}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? `${cat.border} ${cat.bg} ring-2 ring-offset-1 ring-${cat.color.split('-')[1]}-500 shadow-sm` 
                              : 'border-gray-100 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <Icon className={`w-8 h-8 mb-2 ${isSelected ? cat.color : 'text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${isSelected ? cat.color : 'text-gray-600'}`}>{cat.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Vấn đề */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tên thiết bị hỏng <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="VD: Bóng đèn tuýp, Vòi nước bồn rửa mặt..." 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                {/* Mô tả chi tiết */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Mô tả tình trạng chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    required
                    rows="3"
                    placeholder="Mô tả rõ biểu hiện (VD: Đèn bị nhấp nháy, nước chảy yếu...)" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>

                {/* Hình ảnh đính kèm (Bắt buộc theo dự án) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-gray-700">
                      Hình ảnh đính kèm <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-gray-500">{images.length}/3 ảnh</span>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-start gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800">Hệ thống yêu cầu chụp ảnh rõ hiện trạng để kỹ thuật viên chuẩn bị đúng vật tư sửa chữa.</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group">
                        {/* Mock image background */}
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleImageRemove(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {images.length < 3 && (
                      <button 
                        type="button"
                        onClick={handleImageAdd}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <UploadCloud className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Tải ảnh lên</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button 
                    type="submit"
                    disabled={!formData.category || !formData.title || images.length === 0}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200"
                  >
                    Gửi phiếu báo hỏng
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Trạng thái thành công */
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 sm:p-12 text-center animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Gửi báo hỏng thành công!</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Mã Ticket <span className="font-bold text-gray-800">TK-2609-15</span> đã được chuyển đến Đội kỹ thuật tòa nhà. Bạn có thể theo dõi tiến độ sửa chữa tại mục "Tiến độ sửa chữa" trên trang chủ.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button 
                onClick={() => setIsSubmitted(false)} 
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Gửi thêm lỗi khác
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
};

export default TicketReport;
