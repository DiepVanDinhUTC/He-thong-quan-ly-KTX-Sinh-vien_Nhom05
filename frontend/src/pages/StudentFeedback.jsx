import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { studentFeedbackApi } from '../services/studentFeedbackApi';

const StudentFeedback = () => {
  const [form, setForm] = useState({
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
      await studentFeedbackApi.create({
        title: form.title.trim(),
        description: form.content.trim(),
      });
      setSuccess(true);
      setForm({ title: '', content: '' });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi góp ý. Vui lòng thử lại.');
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
            <h1 className="text-xl font-bold text-slate-900">Đánh giá & Góp ý</h1>
            <p className="text-sm text-slate-500">Chia sẻ đánh giá hoặc góp ý về bất kỳ vấn đề nào bạn quan tâm.</p>
          </div>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-semibold text-green-800">Gửi đánh giá thành công!</h2>
            <p className="text-sm text-green-600">Cảm ơn bạn đã chia sẻ ý kiến. Góp ý của bạn sẽ giúp cải thiện chất lượng phục vụ.</p>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
              <input
                type="text"
                required
                maxLength={160}
                placeholder="Nhập tiêu đề đánh giá hoặc góp ý..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
              <textarea
                required
                rows={5}
                minLength={5}
                maxLength={2000}
                placeholder="Mô tả đánh giá, góp ý hoặc vấn đề bạn muốn chia sẻ..."
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
                {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudentFeedback;