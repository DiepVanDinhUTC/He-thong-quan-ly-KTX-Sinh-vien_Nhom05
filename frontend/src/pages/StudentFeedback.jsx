import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

const StudentFeedback = () => {
  const [form, setForm] = useState({
    category: 'NHAN_VIEN', // Loại phản ánh: Nhân viên / Dịch vụ chăm sóc
    targetName: '',         // Tên nhân viên (nếu có)
    title: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Gọi API tương tự các form ticket/request trong hệ thống của nhóm
      // Ví dụ gửi lên endpoint ticket hoặc endpoint feedback riêng của backend
      // Tạm thời mô phỏng gọi thành công:
      await new Promise(resolve => setTimeout(resolve, 800));
      setSuccess(true);
      setForm({ category: 'NHAN_VIEN', targetName: '', title: '', content: '' });
    } catch (err) {
      setError('Không thể gửi phản ánh. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <span className="p-3 bg-blue-100 text-blue-800 rounded-xl">
            <MessageSquare className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Góp ý & Phản ánh dịch vụ</h1>
            <p className="text-sm text-slate-500">Gửi ý kiến đóng góp hoặc phản ánh về tác phong, thái độ của nhân viên phòng chăm sóc người học.</p>
          </div>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-semibold text-green-800">Gửi phản ánh thành công!</h2>
            <p className="text-sm text-green-600">Cảm ơn ý kiến đóng góp của bạn. Ban quản lý KTX sẽ xem xét và phản hồi trong thời gian sớm nhất.</p>
            <button
              onClick={() => setSuccess(false)}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition"
            >
              Gửi thêm phản ánh khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục góp ý</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="NHAN_VIEN">Thái độ / Tác phong nhân viên</option>
                  <option value="DICH_VU">Chất lượng dịch vụ chăm sóc người học</option>
                  <option value="THU_TUC">Quy trình thủ tục hành chính</option>
                  <option value="KHAC">Ý kiến đóng góp khác</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên nhân viên liên quan (nếu có)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A (Phòng CTSV)"
                  value={form.targetName}
                  onChange={(e) => setForm({ ...form, targetName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề phản ánh</label>
              <input
                type="text"
                required
                placeholder="Tóm tắt ngắn gọn nội dung góp ý của bạn..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chi tiết</label>
              <textarea
                required
                rows={5}
                placeholder="Mô tả chi tiết sự việc, thời gian, địa điểm hoặc ý kiến đóng góp của bạn để chúng tôi cải thiện chất lượng phục vụ tốt hơn..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Đang gửi...' : 'Gửi phản ánh'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudentFeedback;