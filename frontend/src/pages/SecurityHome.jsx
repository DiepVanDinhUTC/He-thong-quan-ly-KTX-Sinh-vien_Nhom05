import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, Building2, ClipboardCheck, ShieldCheck } from 'lucide-react';
import SecurityLayout from '../components/SecurityLayout';
import { securitySections } from '../utils/securityNavigation';

const SecurityHome = () => {
  const user = useSelector((state) => state.auth.user);

  return <SecurityLayout title="Trang chủ" description="Kiểm soát khách ra vào và ghi nhận vi phạm nội quy tại KTX.">
    <section className="rounded-2xl bg-blue-900 p-6 text-white shadow-sm sm:p-8">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100"><ShieldCheck className="h-4 w-4" />TRẬT TỰ TRỊ AN KÝ TÚC XÁ</span>
      <h2 className="mt-5 text-2xl font-bold sm:text-3xl">Xin chào, {user?.hoTen || user?.username || 'bạn'}!</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">Theo dõi hoạt động khách ra vào, ghi nhận sự việc và hỗ trợ giữ gìn môi trường nội trú an toàn, đúng nội quy. Chọn một nghiệp vụ bên dưới để bắt đầu ca làm việc.</p>
    </section>

    <section aria-labelledby="security-functions-title">
      <h2 id="security-functions-title" className="text-lg font-bold text-slate-900">Nghiệp vụ của bạn</h2>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {securitySections.filter(({ id }) => id !== 'home').map(({ id, to, label, description, Icon }) => <Link key={id} to={to} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-6 w-6" /></span>
          <h3 className="mt-5 font-bold text-slate-900">{label}</h3>
          <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Mở chức năng<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>)}
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><ClipboardCheck className="h-5 w-5 text-blue-700" />Hướng dẫn trong ca trực</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
          <li>Khi khách đến, ghi thông tin khách, tòa nhà, mục đích và thời điểm vào trong mục Quản lý khách.</li>
          <li>Khi khách rời KTX, mở sổ khách và chọn Ghi nhận khách ra để hoàn tất lượt thăm.</li>
          <li>Khi xảy ra vi phạm, chọn sinh viên liên quan và ghi rõ diễn biến, thời điểm, mức độ cùng biện pháp đã thực hiện.</li>
        </ol>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
        <h2 className="flex items-center gap-2 font-bold text-blue-950"><Building2 className="h-5 w-5 text-blue-700" />Phạm vi phụ trách</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">Có thể tìm sinh viên nội trú và ghi nhận vi phạm trên toàn KTX. Sổ khách hiển thị theo các tòa nhà được phân công.</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">Nếu chưa thấy tòa nhà trong sổ khách, hãy liên hệ người quản lý tài khoản để kiểm tra phân công.</p>
      </div>
    </section>
  </SecurityLayout>;
};

export default SecurityHome;
