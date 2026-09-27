import React from 'react';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AdminDashboard from './pages/AdminDashboard';

import StudentManagement from './pages/StudentManagement';

import RoomManagement from './pages/RoomManagement';

import BillManagement from './pages/BillManagement';



function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* Đường dẫn mặc định (localhost:5173) sẽ hiển thị Dashboard */}

        <Route path="/" element={<AdminDashboard />} />

       

        {/* Đường dẫn /students (localhost:5173/students) sẽ hiển thị Quản lý SV */}

        <Route path="/students" element={<StudentManagement />} />



        <Route path="/rooms" element={<RoomManagement />} />

        <Route path="/bills" element={<BillManagement />} />

      </Routes>

    </BrowserRouter>

  );

}



export default App; 

