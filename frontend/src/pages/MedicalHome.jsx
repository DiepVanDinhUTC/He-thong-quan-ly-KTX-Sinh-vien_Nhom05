import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HeartPulse, Stethoscope, Users } from 'lucide-react';
import MedicalLayout from '../components/MedicalLayout';

const links = [
  { to: '/students', title: 'Hồ sơ sinh viên', description: 'Tra cứu thông tin sinh viên.', Icon: Users },
  { to: '/security-medical?section=health', title: 'Hồ sơ sức khỏe', description: 'Xem và quản lý thông tin sức khỏe sinh viên.', Icon: HeartPulse },
  { to: '/security-medical?section=incidents', title: 'Sự cố y tế & thuốc', description: 'Theo dõi sự cố y tế và thuốc.', Icon: Stethoscope },
];

export default function MedicalHome() {
  return <MedicalLayout title="Trang chủ">
    <section className="rounded-2xl bg-blue-950 p-6 text-white sm:p-8">
      <p className="text-sm font-semibold text-blue-200">KÝ TÚC XÁ · Y TẾ</p>
      <h2 className="mt-2 text-2xl font-bold">Trang chủ nhân viên y tế</h2>
      <p className="mt-2 text-sm text-blue-100">Chọn chức năng để bắt đầu công việc.</p>
    </section>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {links.map(({ to, title, description, Icon }) => <Link key={to} to={to} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
        <Icon className="h-6 w-6 text-blue-700" />
        <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-700">Mở chức năng <ArrowRight className="h-4 w-4" /></span>
      </Link>)}
    </div>
  </MedicalLayout>;
}
