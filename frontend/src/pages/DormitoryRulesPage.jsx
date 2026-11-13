import React from 'react';
import DormitoryRules from '../components/DormitoryRules';

export default function DormitoryRulesPage() {
  return <main className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 sm:py-9">
    <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-blue-700">Cổng sinh viên</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Nội quy ký túc xá</h1>
      <p className="mb-7 mt-2 text-sm text-slate-500">Quy định dành cho sinh viên và học viên lưu trú tại ký túc xá.</p>
      <DormitoryRules />
    </article>
  </main>;
}
