import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, Inbox, Loader2, MessageSquare, RefreshCw, Search, UserRound } from 'lucide-react';
import FacilitiesLayout from '../components/FacilitiesLayout';
import { studentFeedbackApi } from '../services/studentFeedbackApi';

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Thời gian chưa cập nhật' : date.toLocaleString('vi-VN');
};

const StudentFeedbackInbox = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeedbacks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await studentFeedbackApi.list();
      setFeedbacks(response.feedbacks || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải góp ý của sinh viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFeedbacks(); }, []);

  const filteredFeedbacks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return feedbacks;
    return feedbacks.filter((feedback) => (
      `${feedback.title} ${feedback.description} ${feedback.sinhVien?.hoTen || ''} ${feedback.sinhVien?.maSV || ''} ${feedback.toaNha?.tenToaNha || ''} ${feedback.maToaNha || ''}`
        .toLocaleLowerCase('vi')
        .includes(query)
    ));
  }, [feedbacks, search]);
  const selectedFeedback = filteredFeedbacks.find((feedback) => feedback.id === selectedId) || filteredFeedbacks[0];

  return (
    <FacilitiesLayout
      title="Góp ý sinh viên"
      description="Tiếp nhận và xem các đánh giá, góp ý do sinh viên gửi."
      actions={<button type="button" onClick={loadFeedbacks} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Tải lại</button>}
    >
      <section className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Inbox className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-slate-900">Hộp thư góp ý</h2><p className="text-xs text-slate-500">{feedbacks.length} ý kiến</p></div>
          </div>
          <label className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tiêu đề, nội dung, sinh viên" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>

        {error && <div role="alert" className="m-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><p>{error}</p><button type="button" onClick={loadFeedbacks} className="mt-2 font-semibold underline">Thử tải lại</button></div>}
        {loading ? <div role="status" className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải góp ý…</div> : !error && filteredFeedbacks.length === 0 ? <div className="p-10 text-center"><MessageSquare className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{feedbacks.length ? 'Không tìm thấy góp ý phù hợp' : 'Chưa có góp ý từ sinh viên'}</p><p className="mt-1 text-sm text-slate-500">{feedbacks.length ? 'Thử từ khóa khác.' : 'Các ý kiến mới gửi sẽ hiển thị tại đây.'}</p></div> : !error && <div className="grid min-h-[28rem] md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
          <div className="max-h-[36rem] divide-y divide-slate-100 overflow-y-auto border-slate-200 md:border-r">
            {filteredFeedbacks.map((feedback) => <button key={feedback.id} type="button" onClick={() => setSelectedId(feedback.id)} aria-pressed={selectedFeedback?.id === feedback.id} className={`w-full px-4 py-4 text-left transition hover:bg-blue-50/60 ${selectedFeedback?.id === feedback.id ? 'bg-blue-50' : ''}`}>
              <span className="block truncate text-sm font-semibold text-slate-900">{feedback.title}</span>
              <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{feedback.description}</span>
              <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-blue-700"><Building2 className="h-3 w-3" />{feedback.toaNha?.tenToaNha || feedback.maToaNha || 'Chưa xác định tòa'}</span>
              <span className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400"><span className="truncate">{feedback.sinhVien?.hoTen || 'Sinh viên'}{feedback.sinhVien?.maSV ? ` · ${feedback.sinhVien.maSV}` : ''}</span><span className="shrink-0">{formatDate(feedback.createdAt)}</span></span>
            </button>)}
          </div>
          {selectedFeedback && <article className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><MessageSquare className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><h3 className="break-words text-lg font-bold text-slate-900">{selectedFeedback.title}</h3><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(selectedFeedback.createdAt)}</span><span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{selectedFeedback.toaNha?.tenToaNha || selectedFeedback.maToaNha || 'Chưa xác định tòa'}</span></p></div>
            </div>
            <div className="mt-6 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{selectedFeedback.description}</div>
            <div className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-5">
              <span className="rounded-full bg-slate-100 p-2 text-slate-600"><UserRound className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold text-slate-800">{selectedFeedback.sinhVien?.hoTen || 'Sinh viên'}</p><p className="mt-1 text-xs text-slate-500">{[selectedFeedback.sinhVien?.maSV, selectedFeedback.sinhVien?.lop, selectedFeedback.sinhVien?.khoa].filter(Boolean).join(' · ') || 'Chưa có thông tin lớp'}</p></div>
            </div>
          </article>}
        </div>}
      </section>
    </FacilitiesLayout>
  );
};

export default StudentFeedbackInbox;
