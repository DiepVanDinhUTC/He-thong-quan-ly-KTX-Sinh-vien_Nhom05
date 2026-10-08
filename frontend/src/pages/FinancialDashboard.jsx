import React, { useState } from 'react';
import Link from '../components/RoleLink';
import AdminUserProfile from '../components/AdminUserProfile';
import AdminLogoutButton from '../components/AdminLogoutButton';
import { 
  Building,
  Home,
  UserPlus,
  DoorOpen,
  FileSignature,
  Wrench,
  Receipt,
  Settings,
  DollarSign, 
  TrendingUp, 
  AlertOctagon, 
  Send, 
  Zap, 
  CheckCircle2, 
  Eye, 
  RefreshCw,
  Download,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  Clock
} from 'lucide-react';

const FinancialDashboard = () => {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'transactions'

  // Mock data Hóa đơn
  const invoices = [
    { id: 'HD2609-101', room: 'P.101 - A1', roomFee: 1600000, utilFee: 450000, penaltyFee: 0, total: 2050000, status: 'paid' },
    { id: 'HD2609-102', room: 'P.102 - A1', roomFee: 1600000, utilFee: 320000, penaltyFee: 0, total: 1920000, status: 'pending' },
    { id: 'HD2609-104', room: 'P.104 - A1', roomFee: 1600000, utilFee: 510000, penaltyFee: 200000, total: 2310000, status: 'overdue' },
    { id: 'HD2609-205', room: 'P.205 - A5', roomFee: 960000, utilFee: 280000, penaltyFee: 0, total: 1240000, status: 'paid' },
    { id: 'HD2609-301', room: 'P.301 - A6', roomFee: 960000, utilFee: 310000, penaltyFee: 0, total: 1270000, status: 'pending' },
  ];

  // Helper render badge trạng thái hóa đơn
  const renderStatus = (status) => {
    switch (status) {
      case 'paid':
        return <span className="flex items-center w-max px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider rounded-md border border-green-200"><CheckCircle2 className="w-3.5 h-3.5 mr-1"/> Đã thu</span>;
      case 'pending':
        return <span className="flex items-center w-max px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold uppercase tracking-wider rounded-md border border-yellow-200"><Clock className="w-3.5 h-3.5 mr-1"/> Chưa thu</span>;
      case 'overdue':
        return <span className="flex items-center w-max px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-md border border-red-200"><AlertTriangle className="w-3.5 h-3.5 mr-1"/> Quá hạn</span>;
      default:
        return null;
    }
  };

  // Helper format tiền tệ VND
  const formatCurrency = (amount) => {
    return new window.Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800">
      <aside className="flex h-full w-64 shrink-0 flex-col bg-blue-900 text-white shadow-lg">
        <div className="flex items-center justify-center border-b border-blue-800 p-6"><Building className="mr-3 h-8 w-8" /><h1 className="text-xl font-bold tracking-wider">KTX GTVT</h1></div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          <Link to="/" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Home className="h-5 w-5" /><span className="ml-3">Trang chủ</span></Link>
          <Link to="/students" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><UserPlus className="h-5 w-5" /><span className="ml-3">Quản lý Sinh viên</span></Link>
          <Link to="/rooms" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><DoorOpen className="h-5 w-5" /><span className="ml-3">Quản lý Phòng & CSVC</span></Link>
          <Link to="/contracts" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><FileSignature className="h-5 w-5" /><span className="ml-3">Quản lý Hợp đồng</span></Link>
          <Link to="/tickets" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Wrench className="h-5 w-5" /><span className="ml-3">Ticket báo hỏng</span></Link>
          <Link to="/technician" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Wrench className="h-5 w-5" /><span className="ml-3">Bảng kỹ thuật</span></Link>
          <Link to="/financial-dashboard" className="flex items-center rounded-lg bg-blue-800 px-4 py-3 font-medium text-white"><Receipt className="h-5 w-5" /><span className="ml-3">Quản lý Hóa đơn & Điện nước</span></Link>
          <Link to="/settings" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Settings className="h-5 w-5" /><span className="ml-3">Cài đặt hệ thống</span></Link>
        </nav>
        <div className="border-t border-blue-800 p-4"><AdminUserProfile /></div>
        <AdminLogoutButton />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center border-b bg-white px-5 shadow-sm sm:px-8"><h2 className="text-lg font-semibold sm:text-xl">Quản lý Hóa đơn & Điện nước</h2></header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
    <div className="space-y-6">
      
      {/* Tiêu đề & Cụm thao tác nhanh (Quick Actions) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 tracking-tight">Kế toán & Tài chính</h1>
          <p className="text-sm text-gray-500 mt-1">Kỳ thu phí: Tháng 09/2026</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-700 shadow-sm transition-colors">
            <Zap className="w-4 h-4 text-yellow-500" /> Nhập số Điện/Nước
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-700 shadow-sm transition-colors">
            <FileCheck className="w-4 h-4 text-blue-500" /> Lập hóa đơn hàng loạt
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors">
            <Send className="w-4 h-4" /> Gửi nhắc nợ tự động
          </button>
        </div>
      </div>

      {/* KPI Cards (Thẻ thống kê tài chính) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Tỷ lệ thu */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tỷ lệ thu phí T09</p>
              <h3 className="text-3xl font-black text-gray-800 font-mono">82.5%</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '82.5%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">Mục tiêu: 95% trước ngày 15/10</p>
        </div>

        {/* Card 2: Tổng thu */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tổng tiền đã thu</p>
              <h3 className="text-3xl font-black text-green-600 font-mono tracking-tight">350.5M <span className="text-lg text-gray-400">VND</span></h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-green-700 font-medium bg-green-50 px-2 py-1 rounded inline-block w-max mt-auto">
            +12.5M so với tháng trước
          </p>
        </div>

        {/* Card 3: Dư nợ */}
        <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-red-50 rounded-tl-full opacity-50 -z-10"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Dư nợ quá hạn</p>
              <h3 className="text-3xl font-black text-red-600 font-mono tracking-tight">45.2M <span className="text-lg text-red-300">VND</span></h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-red-700 font-medium mt-auto">
            Tương đương 18 hóa đơn chưa thanh toán.
          </p>
        </div>
      </div>

      {/* Cảnh báo Đối soát (VNPAY Sync Errors) */}
      <div className="bg-red-50/50 border border-red-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
            <RefreshCw className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-red-800 mb-1 flex items-center">
              Cần đối soát: Phát hiện 2 giao dịch nghi ngờ lỗi đồng bộ VNPAY
            </h3>
            <p className="text-sm text-red-600 mb-3">
              Hệ thống ghi nhận tiền đã vào tài khoản ngân hàng nhưng trạng thái hóa đơn vẫn là &quot;Chưa thu&quot;. Kế toán cần kiểm tra sao kê và gạch nợ thủ công để sinh viên không bị nhắc nợ oan.
            </p>
            
            {/* List lỗi */}
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-red-50/80 text-red-700 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-2">Mã Giao dịch (Bank)</th>
                    <th className="px-4 py-2">Mã Hóa đơn</th>
                    <th className="px-4 py-2">Số tiền</th>
                    <th className="px-4 py-2 text-right">Xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  <tr className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-600">VNP260900124</td>
                    <td className="px-4 py-2.5 font-bold text-blue-600">HD2609-105A1</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-gray-800">1.850.000 đ</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors">
                        Gạch nợ thủ công
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-600">VNP260900388</td>
                    <td className="px-4 py-2.5 font-bold text-blue-600">HD2609-302A5</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-gray-800">1.250.000 đ</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors">
                        Gạch nợ thủ công
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng Dữ liệu (Data Table) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        
        {/* Tabs & Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50/50">
          <div className="flex bg-gray-200/60 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('invoices')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Danh sách Hóa đơn
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lịch sử Giao dịch
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm mã hóa đơn, phòng..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="p-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bảng Hóa đơn */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold tracking-wider">
                <th className="px-6 py-4">Mã HĐ</th>
                <th className="px-6 py-4">Tên Phòng</th>
                <th className="px-6 py-4 text-right">Tiền phòng</th>
                <th className="px-6 py-4 text-right">Điện & Nước</th>
                <th className="px-6 py-4 text-right">Phí đền bù</th>
                <th className="px-6 py-4 text-right text-blue-900">Tổng thanh toán</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-blue-600">{invoice.id}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{invoice.room}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-600">{formatCurrency(invoice.roomFee)}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-600">{formatCurrency(invoice.utilFee)}</td>
                  <td className="px-6 py-4 text-right font-mono text-red-500">{invoice.penaltyFee > 0 ? formatCurrency(invoice.penaltyFee) : '-'}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 text-base">{formatCurrency(invoice.total)}</td>
                  <td className="px-6 py-4 flex justify-center">{renderStatus(invoice.status)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Xem chi tiết HĐ">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Gạch nợ thủ công (Tiền mặt)">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded" title="Xuất biên lai PDF">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-gray-50">
          <div>Hiển thị 1 đến 5 trong số 230 hóa đơn</div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50" disabled>Trước</button>
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold shadow-sm">1</button>
            <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700">2</button>
            <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700">3</button>
            <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium">Sau</button>
          </div>
        </div>

      </div>

    </div>
        </main>
      </div>
    </div>
  );
};

export default FinancialDashboard;
