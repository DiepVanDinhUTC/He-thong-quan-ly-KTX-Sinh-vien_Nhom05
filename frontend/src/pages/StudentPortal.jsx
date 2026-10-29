import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BedDouble, Building, DoorOpen, PackageCheck, Receipt, Shield, Wrench } from 'lucide-react';
import { isMilitaryLearner } from '../utils/studentResidence';

const StudentPortal = () => {
  const navigate = useNavigate();
  const student = useSelector((state) => state.auth.user);
  const isMilitaryStudent = student?.role === 'MILITARY_STUDENT';
  const hasMilitaryStudy = isMilitaryLearner(student);
  const studentName = student?.hoTen || student?.username || 'bạn';
  const features = [
    ...(hasMilitaryStudy ? [{ path: '/military-stay', title: 'Đợt học GDQP', description: 'Xem phòng 14 ngày, thời gian học, chỗ nội trú gốc và quân tư trang đã nhận.', Icon: Shield, color: 'indigo', action: 'Xem đợt học' }] : []),
    ...(!isMilitaryStudent ? [{ path: '/room-registration', title: 'Đăng ký nội trú', description: 'Gửi nguyện vọng phòng và theo dõi kết quả xét duyệt.', Icon: DoorOpen, color: 'blue', action: 'Tạo đăng ký' }] : []),
    { path: '/my-room', title: isMilitaryStudent ? 'Tra cứu phòng được xếp' : 'Phòng ở & lưu trú', description: isMilitaryStudent ? 'Xem thông tin phòng và thời gian lưu trú đã được bố trí.' : 'Xem phòng hiện tại, bạn cùng phòng và gửi yêu cầu chuyển hoặc trả phòng.', Icon: BedDouble, color: 'indigo', action: 'Xem thông tin' },
    { path: '/service-registration', title: 'Đăng ký dịch vụ', description: hasMilitaryStudy ? 'Dịch vụ Wi-Fi, giặt sấy, gửi xe dành cho hợp đồng nội trú gốc đang hiệu lực.' : 'Đăng ký Wi-Fi, giặt sấy, gửi xe và theo dõi xác nhận.', Icon: PackageCheck, color: 'emerald', action: 'Xem dịch vụ' },
    { path: '/bill-payment', title: 'Hóa đơn & thanh toán', description: hasMilitaryStudy ? 'Tra cứu khoản phí và biên nhận của bạn; phân phòng GDQP không tự tạo hóa đơn.' : 'Theo dõi phí lưu trú, khoản phát sinh và biên nhận.', Icon: Receipt, color: 'cyan', action: 'Xem hóa đơn' },
    { path: '/ticket-report', title: 'Báo hỏng cơ sở vật chất', description: hasMilitaryStudy ? 'Báo sự cố đúng phòng đang ở: phòng GDQP trong đợt học, phòng nội trú sau đợt học.' : 'Gửi ảnh sự cố, xem tiến độ sửa chữa và nghiệm thu kết quả.', Icon: Wrench, color: 'amber', action: 'Báo sự cố' },
  ];
  const colors = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100', indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100', cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  };

  return <main className="bg-gradient-to-b from-blue-50/70 via-slate-50 to-slate-50 px-4 py-6 text-slate-800 sm:px-6 sm:py-9">
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-800 px-5 py-7 text-white shadow-lg sm:px-9 sm:py-10">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" aria-hidden="true" />
        <div className="absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-cyan-300/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100"><Building className="h-4 w-4" />CỔNG TỰ PHỤC VỤ KÝ TÚC XÁ</p>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Xin chào, {studentName}!</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">{hasMilitaryStudy ? 'Dùng chung cổng sinh viên để theo dõi đợt GDQP 2 tuần, phòng được phân, quân tư trang, khoản phí và yêu cầu hỗ trợ. Nếu đang nội trú, hợp đồng và chỗ ở gốc vẫn được giữ theo hiệu lực.' : 'Quản lý cuộc sống nội trú của bạn tại một nơi: đăng ký phòng, sử dụng dịch vụ và theo dõi các yêu cầu.'}</p>
          </div>
          <button type="button" onClick={() => navigate(hasMilitaryStudy ? '/military-stay' : '/room-registration')} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-900 shadow-sm transition hover:bg-blue-50 sm:w-auto">
            {hasMilitaryStudy ? <Shield className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
            {hasMilitaryStudy ? 'Xem đợt học GDQP' : 'Đăng ký nội trú'}<ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-lg font-bold text-slate-900">Dịch vụ dành cho {isMilitaryStudent ? 'học viên quân sự' : 'sinh viên'}</h2><p className="mt-1 text-sm text-slate-500">Chọn một mục để xem thông tin hoặc gửi yêu cầu.</p></div>
          <span className="text-xs font-medium text-slate-400">{features.length} chức năng</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ path, title, description, Icon, color, action }) => <button key={path} type="button" onClick={() => navigate(path)} className="group flex min-h-48 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${colors[color]}`}><Icon className="h-5 w-5" /></span>
            <span className="mt-4 font-bold text-slate-900">{title}</span>
            <span className="mt-1 flex-1 text-sm leading-6 text-slate-600">{description}</span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">{action}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </button>)}
        </div>
      </section>
      <p className="text-center text-xs text-slate-400">Cần hỗ trợ? Hãy gửi yêu cầu qua đúng chức năng để Ban quản lý tiếp nhận nhanh hơn.</p>
    </div>
  </main>;
};

export default StudentPortal;
