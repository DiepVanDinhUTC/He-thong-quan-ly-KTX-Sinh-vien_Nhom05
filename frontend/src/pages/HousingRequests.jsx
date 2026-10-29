/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, DoorOpen, Loader2, RotateCcw } from 'lucide-react';
import { authApi } from '../services/authApi';
import { housingApi } from '../services/housingApi';
import { roomTypes, roomTypeLabel } from '../utils/roomTypes';

const STATUS = { PENDING: 'Chờ xử lý', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };

const HousingRequests = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [atMilitaryStudy, setAtMilitaryStudy] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestType, setRequestType] = useState('TRANSFER');
  const [roomType, setRoomType] = useState('CO_BAN');
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRequests = async () => {
    const data = await housingApi.myHousingRequests();
    setRequests(data.requests || []);
  };

  useEffect(() => {
    let active = true;
    Promise.all([authApi.me(), housingApi.myHousingRequests()]).then(([profile, data]) => {
      if (!active) return;
      setContract(profile.user.currentContract || null);
      setAtMilitaryStudy(profile.user.militaryStay?.state === 'ACTIVE');
      setRequests(data.requests || []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Không thể tải thông tin lưu trú.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (requestType !== 'TRANSFER') { setRooms([]); setRoomId(''); return undefined; }
    setRoomId('');
    housingApi.availableRooms(roomType).then((response) => {
      if (active) setRooms((response.data || []).filter((room) => room.maPhong !== contract?.maPhong));
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Không thể tải danh sách phòng trống.');
    });
    return () => { active = false; };
  }, [requestType, roomType, contract?.maPhong]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await housingApi.createHousingRequest({
        requestType,
        ...(requestType === 'TRANSFER' ? { maPhongMoi: roomId } : {}),
        reason,
      });
      setNotice(response.message || 'Yêu cầu đã được gửi.');
      setReason(''); setRoomId('');
      await loadRequests();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi yêu cầu.');
    } finally { setBusy(false); }
  };

  const hasPendingRequest = requests.some((item) => item.status === 'PENDING');
  const canRequest = contract?.trangThai === 'ACTIVE' && !hasPendingRequest;

  const content = <div className={`space-y-5 ${embedded ? '' : 'mx-auto max-w-3xl'}`}>
      {!embedded && <button onClick={() => navigate('/student-portal')} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700"><ArrowLeft className="h-4 w-4" />Về trang chủ</button>}
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><ArrowLeftRight className="h-5 w-5" /></span><div><h1 className="text-xl font-bold">Chuyển hoặc trả phòng</h1><p className="mt-1 text-sm text-slate-500">Đơn chuyển phòng do nhân viên quản lý hồ sơ xác nhận và cập nhật hợp đồng.</p></div></div>
        {atMilitaryStudy && <p className="mb-4 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">Bạn đang ở phòng GDQP tạm thời. Yêu cầu ở đây thay đổi hợp đồng nội trú gốc, không phải phòng quân sự. Bạn không cần gửi yêu cầu chuyển hoặc trả phòng để tham gia hay kết thúc đợt GDQP.</p>}
        {loading ? <p className="text-sm text-slate-500">Đang tải thông tin...</p> : !contract ? <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p>Bạn chưa có phòng lưu trú.</p>{!embedded && <button onClick={() => navigate('/room-registration')} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white"><DoorOpen className="h-4 w-4" />Đăng ký nội trú</button>}</div> : contract.trangThai !== 'ACTIVE' ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Hợp đồng đang chờ thanh toán nên chưa thể gửi yêu cầu chuyển hoặc trả phòng.</p> : null}

        {canRequest && <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setRequestType('TRANSFER')} className={`rounded-xl border-2 p-4 text-left ${requestType === 'TRANSFER' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}><ArrowLeftRight className="mb-2 h-5 w-5 text-blue-700" /><span className="block font-semibold">Xin chuyển phòng</span><span className="mt-1 block text-xs text-slate-500">Chọn phòng trống muốn chuyển đến.</span></button>
            <button type="button" onClick={() => setRequestType('RETURN')} className={`rounded-xl border-2 p-4 text-left ${requestType === 'RETURN' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}><RotateCcw className="mb-2 h-5 w-5 text-blue-700" /><span className="block font-semibold">Xin trả phòng</span><span className="mt-1 block text-xs text-slate-500">Gửi yêu cầu kết thúc lưu trú.</span></button>
          </div>
          {requestType === 'TRANSFER' && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Loại phòng<select value={roomType} onChange={(event) => setRoomType(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5">{roomTypes.filter((type) => type.capacities.length).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            <label className="text-sm font-medium">Phòng muốn chuyển đến<select required value={roomId} onChange={(event) => setRoomId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5"><option value="">Chọn phòng còn chỗ</option>{rooms.map((room) => <option key={room.maPhong} value={room.maPhong}>{room.soPhong || room.maPhong} · {roomTypeLabel(room.loaiPhong)} · còn {room.choConTrong} chỗ</option>)}</select></label>
          </div>}
          <label className="block text-sm font-medium">Lý do <span className="font-normal text-slate-400">(không bắt buộc)</span><textarea rows="3" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5" placeholder="Cho Ban quản lý biết thêm thông tin về yêu cầu của bạn." /></label>
          <button disabled={busy || (requestType === 'TRANSFER' && !roomId)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Gửi yêu cầu</button>
        </form>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {contract?.trangThai === 'ACTIVE' && hasPendingRequest && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Bạn đã có yêu cầu đang chờ xử lý. Vui lòng đợi Ban quản lý phản hồi trước khi gửi yêu cầu mới.</p>}
        {contract && <p className="mt-5 border-t pt-4 text-xs text-slate-500">Hợp đồng {contract.maHopDong} · Phòng hiện tại {contract.soPhong || contract.maPhong} · {contract.trangThai === 'ACTIVE' ? 'Đang hiệu lực' : 'Chờ thanh toán'}</p>}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-4 font-bold">Lịch sử yêu cầu</h2>{requests.length === 0 ? <p className="text-sm text-slate-500">Bạn chưa gửi yêu cầu chuyển hoặc trả phòng.</p> : <div className="divide-y">{requests.map((item) => <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div><p className="font-semibold">{item.requestType === 'TRANSFER' ? `Xin chuyển đến phòng ${item.maPhongMoi}` : 'Xin trả phòng'}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('vi-VN')} · Hợp đồng {item.maHopDong}</p>{item.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.reason}</p>}{item.staffNote && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">Phản hồi: {item.staffNote}</p>}</div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : item.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{STATUS[item.status] || item.status}</span></article>)}</div>}</section>
    </div>;

  return embedded ? <section className="mt-6">{content}</section> : <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800">{content}</main>;
};

export default HousingRequests;
