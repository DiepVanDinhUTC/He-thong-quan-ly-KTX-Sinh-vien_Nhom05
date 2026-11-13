import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Star } from 'lucide-react';
import FacilitiesLayout from '../components/FacilitiesLayout';
import { housingApi } from '../services/housingApi';
import { roomHousekeepingApi } from '../services/roomHousekeepingApi';

const ARTICLES = [
  {
    key: 'generalScore',
    title: 'Điều 1 · Quy định chung',
    items: [
      'Ra vào KTX đúng giờ (mở cửa 5h00, đóng cửa 23h00).',
      'Thực hiện nếp sống văn minh, chấp hành nội quy và hướng dẫn sắp xếp chỗ ở.',
      'Chấp hành kiểm tra của cán bộ và thực hiện nghĩa vụ phí đúng hạn.',
    ],
  },
  {
    key: 'livingScore',
    title: 'Điều 2 · Quy định về sinh hoạt',
    items: [
      'Sinh hoạt đúng giờ; không sử dụng rượu bia, đánh bạc hoặc tàng trữ vật cấm.',
      'Không nấu ăn, làm hư hại tường trần hoặc che chắn gây mất mỹ quan.',
      'Phòng gọn gàng, đồ dùng để đúng nơi quy định.',
    ],
  },
  {
    key: 'securityScore',
    title: 'Điều 3 · An ninh trật tự',
    items: [
      'Không tự ý đưa khách vào phòng, gây mất trật tự hoặc đánh nhau.',
      'Không trèo tường/rào, tự ý lên sân thượng hoặc tham gia hoạt động trái quy định.',
      'Chấp hành quy định phòng cháy chữa cháy.',
    ],
  },
  {
    key: 'propertyScore',
    title: 'Điều 4 · Bảo vệ tài sản',
    items: [
      'Tự bảo quản tài sản cá nhân và giữ gìn tài sản chung.',
      'Bồi thường hư hỏng, mất mát do mình gây ra.',
      'Bàn giao phòng và tài sản khi kết thúc lưu trú.',
    ],
  },
  {
    key: 'environmentScore',
    title: 'Điều 5 · Vệ sinh môi trường',
    items: [
      'Giữ vệ sinh phòng, hành lang, cầu thang, ban công và khu vực chung.',
      'Phân công trực nhật, tập kết và đổ rác đúng nơi quy định.',
    ],
  },
];
const EMPTY_SCORES = Object.fromEntries(ARTICLES.map(({ key }) => [key, 0]));
const SCORE_LABELS = { 1: 'Kém', 2: 'Chưa đạt', 3: 'Đạt', 4: 'Tốt', 5: 'Rất tốt' };
const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật thời gian' : date.toLocaleString('vi-VN');
};
const currentMonthKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(({ type }) => type === 'year')?.value}-${parts.find(({ type }) => type === 'month')?.value}`;
};
const monthKey = (value) => String(value || '').slice(0, 7);
const formatMonth = (value) => {
  const [year, month] = monthKey(value).split('-');
  return year && month ? `${month}/${year}` : 'tháng chưa xác định';
};

const RoomHousekeepingEvaluation = () => {
  const [rooms, setRooms] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [maPhong, setMaPhong] = useState('');
  const [editingId, setEditingId] = useState('');
  const [scores, setScores] = useState(EMPTY_SCORES);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fillFromEvaluation = (evaluation) => {
    setMaPhong(evaluation.maPhong);
    setEditingId(evaluation.id);
    setScores(Object.fromEntries(ARTICLES.map(({ key }) => [key, evaluation[key]])));
    setNotes(evaluation.notes || '');
    setError('');
    setNotice('');
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [roomResponse, evaluationResponse] = await Promise.all([
        housingApi.roomMap(),
        roomHousekeepingApi.list(),
      ]);
      const availableRooms = roomResponse.data || [];
      const availableEvaluations = evaluationResponse.evaluations || [];
      setRooms(availableRooms);
      setEvaluations(availableEvaluations);
      if (!maPhong) {
        const firstRoomId = availableRooms[0]?.maPhong || '';
        setMaPhong(firstRoomId);
        const monthlyEvaluation = availableEvaluations.find((evaluation) => evaluation.maPhong === firstRoomId && monthKey(evaluation.periodMonth) === currentMonthKey());
        if (monthlyEvaluation) fillFromEvaluation(monthlyEvaluation);
      } else if (!availableRooms.some((room) => room.maPhong === maPhong)) {
        setMaPhong(availableRooms[0]?.maPhong || '');
        setEditingId('');
        setScores(EMPTY_SCORES);
        setNotes('');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách phòng và lịch sử chấm điểm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectedRoom = rooms.find((room) => room.maPhong === maPhong);
  const totalScore = useMemo(() => Object.values(scores).reduce((total, score) => total + score, 0), [scores]);
  const completedScores = Object.values(scores).filter(Boolean).length;
  const editingEvaluation = evaluations.find((evaluation) => evaluation.id === editingId);

  const selectRoom = (event) => {
    const nextMaPhong = event.target.value;
    const monthlyEvaluation = evaluations.find((evaluation) => evaluation.maPhong === nextMaPhong && monthKey(evaluation.periodMonth) === currentMonthKey());
    if (monthlyEvaluation) {
      fillFromEvaluation(monthlyEvaluation);
      return;
    }
    setMaPhong(nextMaPhong);
    setEditingId('');
    setScores(EMPTY_SCORES);
    setNotes('');
    setError('');
    setNotice('');
  };

  const selectEvaluation = (evaluation) => fillFromEvaluation(evaluation);

  const cancelHistoricalEdit = () => {
    const monthlyEvaluation = evaluations.find((evaluation) => evaluation.maPhong === maPhong && monthKey(evaluation.periodMonth) === currentMonthKey());
    if (monthlyEvaluation) {
      fillFromEvaluation(monthlyEvaluation);
      return;
    }
    setEditingId('');
    setScores(EMPTY_SCORES);
    setNotes('');
    setError('');
    setNotice('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (completedScores !== ARTICLES.length) {
      setError('Vui lòng chấm điểm đủ 5 điều trước khi lưu.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = editingId
        ? await roomHousekeepingApi.update(editingId, { ...scores, notes: notes.trim() })
        : await roomHousekeepingApi.create({ maPhong, ...scores, notes: notes.trim() });
      setEditingId(response.evaluation.id);
      setNotice(`${editingId ? 'Đã cập nhật' : 'Đã lưu'} điểm nội vụ phòng ${selectedRoom?.soPhong || maPhong} tháng ${formatMonth(response.evaluation.periodMonth)}: ${totalScore}/25.`);
      try {
        const history = await roomHousekeepingApi.list();
        setEvaluations(history.evaluations || []);
      } catch {
        setError('Đã lưu kết quả, nhưng không tải lại được lịch sử chấm. Hãy tải lại trang.');
      }
    } catch (requestError) {
      const existingEvaluation = requestError.response?.data?.evaluation;
      if (requestError.response?.status === 409 && existingEvaluation) {
        setEvaluations((current) => [existingEvaluation, ...current.filter((evaluation) => evaluation.id !== existingEvaluation.id)].slice(0, 100));
        fillFromEvaluation(existingEvaluation);
        setNotice('Phòng đã được chấm trong tháng này; kết quả hiện có đã mở để chỉnh sửa.');
        return;
      }
      setError(requestError.response?.data?.message || 'Không thể lưu điểm nội vụ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FacilitiesLayout
      title="Chấm điểm nội vụ"
      description="Đánh giá từng phòng theo 5 điều trong nội quy ký túc xá."
      actions={<button type="button" onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Tải lại</button>}
    >
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</p>}
      {loading ? <div role="status" className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải dữ liệu phòng…</div> : rooms.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Không có phòng thuộc tòa nhà được phân công.</div> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={submit} className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><ClipboardCheck className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Thông tin phòng được đánh giá</h2><p className="text-sm text-slate-500">Chọn phòng thuộc tòa nhà bạn phụ trách.</p></div></div>
            <label className="block text-sm font-semibold text-slate-700">Phòng<select required value={maPhong} onChange={selectRoom} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">{rooms.map((room) => <option key={room.maPhong} value={room.maPhong}>Phòng {room.soPhong} · {room.toaNha?.tenToaNha || room.tenToaNha || room.maToaNha}</option>)}</select></label>
            {selectedRoom && <p className="mt-3 text-xs text-slate-500">{selectedRoom.toaNha?.tenToaNha || selectedRoom.tenToaNha || selectedRoom.maToaNha} · {selectedRoom.soSinhVienHienTai || 0} sinh viên đang ở</p>}
            {editingEvaluation && <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">Đang sửa lượt chấm tháng {formatMonth(editingEvaluation.periodMonth)}. Mỗi phòng chỉ có một lượt chấm trong tháng.</p>}
          </section>

          {ARTICLES.map(({ key, title, items }, index) => <section key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Tiêu chí {index + 1}/5</p><h2 className="mt-1 font-bold text-slate-900">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{scores[key] ? `${scores[key]}/5 · ${SCORE_LABELS[scores[key]]}` : 'Chưa chấm'}</span></div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul>
            <fieldset className="mt-4"><legend className="mb-2 text-sm font-semibold text-slate-700">Điểm đánh giá</legend><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" aria-label={`${score} điểm, ${SCORE_LABELS[score]}`} aria-pressed={scores[key] === score} onClick={() => setScores((current) => ({ ...current, [key]: score }))} className={`inline-flex min-w-14 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${scores[key] === score ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}><Star className={`h-4 w-4 ${scores[key] >= score ? 'fill-amber-400 text-amber-500' : ''}`} />{score}</button>)}</div></fieldset>
          </section>)}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label className="block text-sm font-semibold text-slate-700">Nhận xét thêm <span className="font-normal text-slate-400">(không bắt buộc)</span><textarea rows={4} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Ghi nhận tình trạng, điểm cần khắc phục hoặc đề xuất hỗ trợ…" /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{notes.length}/2000</span></label>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-sm font-semibold text-slate-700">Tổng điểm <span className="text-lg text-indigo-800">{totalScore}/25</span></p><div className="flex flex-wrap gap-2">{editingEvaluation && monthKey(editingEvaluation.periodMonth) !== currentMonthKey() && <button type="button" disabled={busy} onClick={cancelHistoricalEdit} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Hủy sửa</button>}<button disabled={busy || !maPhong || completedScores !== ARTICLES.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Đang lưu…' : editingId ? 'Cập nhật điểm' : 'Lưu điểm tháng này'}</button></div></div>
          </section>
        </form>

        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Lịch sử chấm gần đây</h2><p className="mt-1 text-xs text-slate-500">100 lượt chấm mới nhất trong các tòa được phân công.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{evaluations.length}</span></div>
          {evaluations.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có lượt chấm điểm nào.</p> : <div className="max-h-[42rem] space-y-3 overflow-y-auto">{evaluations.map((evaluation) => {
            const score = evaluation.generalScore + evaluation.livingScore + evaluation.securityScore + evaluation.propertyScore + evaluation.environmentScore;
            return <button key={evaluation.id} type="button" onClick={() => selectEvaluation(evaluation)} aria-pressed={editingId === evaluation.id} className={`w-full rounded-xl border p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 ${editingId === evaluation.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}><span className="flex items-start justify-between gap-3"><span><span className="block font-semibold text-slate-800">Phòng {evaluation.phong?.soPhong || evaluation.maPhong}</span><span className="mt-1 block text-xs text-slate-500">{evaluation.phong?.toaNha?.tenToaNha || evaluation.phong?.maToaNha}</span></span><span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-800">{score}/25</span></span><span className="mt-3 block text-xs text-slate-500">Tháng {formatMonth(evaluation.periodMonth)} · Chấm lúc {formatDate(evaluation.createdAt)}</span><span className="mt-2 block text-xs font-semibold text-indigo-700">Chọn để sửa điểm</span>{evaluation.notes && <span className="mt-2 block line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{evaluation.notes}</span>}</button>;
          })}</div>}
        </section>
      </div>}
    </FacilitiesLayout>
  );
};

export default RoomHousekeepingEvaluation;
