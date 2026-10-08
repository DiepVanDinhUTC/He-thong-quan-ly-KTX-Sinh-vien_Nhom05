import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';

const SystemSettings = () => (
  <main className="min-h-screen bg-gray-50 p-6 sm:p-10">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900">
        <ArrowLeft className="h-4 w-4" /> Quay lại trang quản lý
      </Link>
      <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Settings className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
            <p className="mt-1 text-sm text-gray-500">Quản lý cấu hình chung của hệ thống KTX.</p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-dashed bg-gray-50 p-5">
          <p className="font-medium text-gray-800">Chưa có cấu hình hệ thống được triển khai.</p>
          <p className="mt-1 text-sm leading-6 text-gray-600">Các thiết lập như thông tin cơ sở, đơn giá điện nước và thông báo chưa được lưu trong cơ sở dữ liệu. Màn hình này hiện là điểm truy cập cho chức năng cài đặt.</p>
        </div>
      </section>
    </div>
  </main>
);

export default SystemSettings;
