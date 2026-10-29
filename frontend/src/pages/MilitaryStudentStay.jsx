import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Package, Shield } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '../services/authApi';
import { housingApi } from '../services/housingApi';
import { userUpdated } from '../store/authSlice';
import { militaryStayLabels, residenceDate } from '../utils/studentResidence';

const MilitaryStudentStay = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([authApi.me(), housingApi.myMilitaryStay()]).then(([profile, data]) => {
      if (!active) return;
      dispatch(userUpdated(profile.user)); setIssues(data.issues || []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Không thể tải thông tin đợt học GDQP.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dispatch, revision]);
  const stay = user?.militaryStay;
  const contract = user?.currentContract;

  return <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
    <header><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Shield className="h-6 w-6 text-blue-700" />Đợt học GDQP của tôi</h1><p className="mt-2 text-sm text-slate-500">Tra cứu phân phòng 14 ngày và quân tư trang trong cùng cổng sinh viên nội trú.</p></header>
    {loading ? <p role="status" className="rounded-xl border bg-white p-6 text-sm text-slate-500">Đang tải thông tin đợt học…</p> : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}<button type="button" onClick={() => setRevision((value) => value + 1)} className="ml-3 font-semibold underline">Thử lại</button></div> : <>
      <section className="rounded-2xl bg-blue-900 p-6 text-white">
        <p className="text-sm font-semibold text-blue-200">{stay ? militaryStayLabels[stay.state] : 'Chưa có phân phòng GDQP'}</p>
        <h2 className="mt-2 text-xl font-bold">{stay ? `Phòng ${stay.soPhong || stay.maPhong} · ${stay.tenToaNha || 'Khu quân sự'}` : 'Chờ cán bộ quân sự bố trí đợt học'}</h2>
        {stay && <><p className="mt-3 flex items-center gap-2 text-sm text-blue-100"><CalendarDays className="h-4 w-4" />Từ {residenceDate(stay.ngayBatDau)} đến {residenceDate(stay.ngayKetThuc)}</p>{stay.batchCode && <p className="mt-2 text-sm text-blue-100">Mã đợt: {stay.batchCode}</p>}</>}
        <p className="mt-4 text-sm leading-6 text-blue-100">Phòng GDQP do cán bộ quân sự phân công trong 2 tuần. Việc vào hoặc rời phòng GDQP không chuyển, thanh lý hay tạo hợp đồng nội trú và không tự phát sinh hóa đơn phòng quân sự.</p>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-bold text-slate-900">Chỗ ở nội trú gốc</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{contract ? `Phòng ${contract.soPhong || contract.maPhong} · Hợp đồng ${contract.maHopDong}. Giường nội trú được giữ theo hiệu lực hợp đồng trong thời gian học GDQP; không cấp lại cho người khác. Khi đợt học kết thúc, đây tiếp tục là chỗ ở của bạn nếu hợp đồng còn hiệu lực.` : 'Bạn không có hợp đồng nội trú thường xuyên. Khi hết đợt GDQP, quyền sử dụng phòng quân sự kết thúc; hệ thống không tự tạo hợp đồng nội trú mới.'}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">Các khoản phí theo hợp đồng nội trú gốc vẫn theo dõi riêng. Đi học GDQP không tự thay đổi mức phí hoặc miễn giảm tiền phòng.</p>
        <Link to="/my-room" className="mt-4 inline-block text-sm font-semibold text-blue-700">Xem phòng ở và hợp đồng</Link>
      </section>
      <section className="overflow-hidden rounded-2xl border bg-white">
        <h2 className="flex items-center gap-2 border-b p-5 font-bold"><Package className="h-5 w-5 text-blue-700" />Quân tư trang đã nhận</h2>
        {issues.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Mặt hàng', 'Cỡ / đơn vị', 'Đã nhận', 'Đã trả', 'Còn phải trả'].map((label) => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{issues.map((issue) => <tr key={issue.id}><td className="px-5 py-4 font-medium">{issue.item?.name}</td><td className="px-5 py-4">{issue.item?.size || '—'} / {issue.item?.unit}</td><td className="px-5 py-4">{issue.quantity}</td><td className="px-5 py-4">{issue.returnedQuantity}</td><td className="px-5 py-4 font-semibold">{Math.max(0, issue.quantity - issue.returnedQuantity)}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-slate-500">Chưa có phiếu cấp phát quân tư trang.</p>}
        <p className="border-t p-5 text-sm text-slate-500">Liên hệ cán bộ quân sự khi số lượng chưa đúng hoặc cần hoàn trả. Học viên tra cứu phiếu; cán bộ ghi nhận cấp phát và thu hồi.</p>
      </section>
    </>}
  </div>;
};

export default MilitaryStudentStay;
