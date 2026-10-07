import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { loginSuccess } from '../store/authSlice';
import {
  Building,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Info,
  CheckCircle2
} from 'lucide-react';

const LoginPortal = () => {
  // --- STATES UI GỐC ---
  const [role, setRole] = useState('student'); // 'student' | 'staff'
  const [showPassword, setShowPassword] = useState(false);

  // --- STATES LOGIC KẾT NỐI API ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- HÀM XỬ LÝ ĐĂNG NHẬP ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Gọi API đăng nhập (gửi username/mã SV và password)
      const data = await authApi.login(username, password);
      
      // Lưu thông tin và Token vào Redux
      dispatch(loginSuccess({
        user: data.user || data.data,
        token: data.token 
      }));

      // Điều hướng dựa trên vai trò
      const loggedInUser = data.user || data.data;
      if (loggedInUser.role === 'STUDENT') {
        navigate('/student-portal');
      } else {
        navigate('/');
      }

    } catch (err) {
      // Bắt lỗi từ backend trả về hoặc hiện lỗi mặc định
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 antialiased font-sans">
      
      {/* PHẦN TRÁI: HERO / BRANDING (Giữ nguyên) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-blue-900 overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Building className="w-7 h-7 text-blue-900" />
          </div>
          <span className="text-2xl font-black tracking-wider text-white">CampusLodge.</span>
        </div>

        <div className="relative z-10 mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-800/50 border border-blue-700/50 text-blue-200 text-sm font-medium mb-6 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4" /> Hệ thống An toàn & Bảo mật
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Nơi bắt đầu<br />
            hành trình nội trú<br />
            <span className="text-blue-300">thông minh.</span>
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            Hệ sinh thái quản lý Ký túc xá Đại học Giao thông Vận tải. Nhanh chóng, minh bạch và số hóa 100% quy trình.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-blue-200/60 text-sm">
          <p>© 2026 UTC Dormitory Management</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
          </div>
        </div>
      </div>

      {/* PHẦN PHẢI: LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        
        <div className="absolute top-8 left-8 flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center shadow-sm">
            <Building className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-wider text-blue-900">CampusLodge.</span>
        </div>

        <div className="w-full max-w-md mt-12 lg:mt-0">
          
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Đăng nhập</h2>
            <p className="text-gray-500 text-sm">Vui lòng chọn vai trò và nhập thông tin của bạn</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100">
            
            <div className="flex p-1 bg-gray-100/80 rounded-xl mb-8">
              <button 
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                  role === 'student' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRole('student')}
              >
                <GraduationCap className="w-4 h-4" /> Sinh viên
              </button>
              <button 
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                  role === 'staff' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRole('staff')}
              >
                <ShieldCheck className="w-4 h-4" /> Cán bộ quản lý
              </button>
            </div>

            {/* Đã thêm sự kiện onSubmit */}
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {role === 'student' ? 'Mã sinh viên' : 'Tên đăng nhập / Email'}
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === 'student' ? 'VD: 231230743' : 'VD: admin@utc.edu.vn'} 
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-gray-800 placeholder-gray-400" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-gray-800 placeholder-gray-400" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-blue-500 flex items-center justify-center transition-colors">
                    <input type="checkbox" className="hidden peer" />
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 select-none">Ghi nhớ đăng nhập</span>
                </label>
                {role === 'student' && <Link to="/forgot-password" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  Quên mật khẩu?
                </Link>}
              </div>

              {/* Hiển thị thông báo lỗi nếu có */}
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 bg-blue-600 text-white rounded-xl font-bold text-[15px] hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Link to="/room-registration" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
              <BookOpen className="w-4 h-4" /> Xem hướng dẫn đăng ký nội trú
            </Link>
            <a href="#" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
              <Info className="w-4 h-4" /> Quy định Ký túc xá ĐH GTVT
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPortal;
