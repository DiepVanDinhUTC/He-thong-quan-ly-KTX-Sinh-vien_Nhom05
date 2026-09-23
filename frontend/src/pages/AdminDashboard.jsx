import React from 'react';
import { 
  Search, Bell, LayoutDashboard, Users, 
  BedDouble, CreditCard, Settings, Plus, 
  Zap, CheckCircle, AlertTriangle, Clock,
  MoreVertical
} from 'lucide-react';

const STATS = [
  { label: 'Total Students', value: '1,248', trend: '+12 this month' },
  { label: 'Vacant Rooms', value: '42', trend: '3% of capacity', alert: true },
  { label: 'Monthly Revenue', value: '$452,000', trend: '+4.2% vs last month' },
  { label: 'Pending Requests', value: '18', trend: '5 urgent', warning: true },
];

const REQUESTS = [
  { id: 'REQ-8021', student: 'Sarah Jenkins', room: 'A-412', type: 'Maintenance', priority: 'High', status: 'Pending', date: '2 hrs ago' },
  { id: 'REQ-8020', student: 'Michael Chang', room: 'B-108', type: 'Room Transfer', priority: 'Medium', status: 'Pending', date: '5 hrs ago' },
  { id: 'REQ-8019', student: 'Emma Watson', room: 'C-302', type: 'Complaint', priority: 'High', status: 'Resolved', date: '1 day ago' },
  { id: 'REQ-8018', student: 'David Smith', room: 'A-221', type: 'Maintenance', priority: 'Low', status: 'Resolved', date: '2 days ago' },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
            <BedDouble className="w-6 h-6" />
            <span>CampusLodge</span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active />
          <NavItem icon={<Users />} label="Student Management" />
          <NavItem icon={<BedDouble />} label="Room Management" />
          <NavItem icon={<CreditCard />} label="Services & Billing" />
          <div className="mt-auto pt-6">
            <NavItem icon={<Settings />} label="Settings" />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search students, rooms, or requests..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button className="flex items-center gap-3 text-left">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&auto=format" 
                alt="Admin Avatar" 
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
              <div className="hidden lg:block text-sm">
                <p className="font-medium text-slate-700">Admin User</p>
                <p className="text-slate-500 text-xs">Housing Director</p>
              </div>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard Overview</h1>
              <p className="text-slate-500 mt-1">Monitor campus accommodation and student requests.</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map((stat, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-sm font-medium text-slate-500 mb-2">{stat.label}</span>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-3xl font-semibold text-slate-800">{stat.value}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    {stat.warning ? (
                      <span className="flex items-center text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3 mr-1" /> {stat.trend}
                      </span>
                    ) : stat.alert ? (
                      <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        <CheckCircle className="w-3 h-3 mr-1" /> {stat.trend}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">{stat.trend}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Two Column Layout for Actions & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">Quick Actions</h2>
                <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <ActionCard 
                    icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
                    title="Approve & Assign Rooms"
                    description="Process 12 pending applications"
                    bg="bg-blue-50"
                  />
                  <div className="h-px bg-slate-100 mx-4"></div>
                  <ActionCard 
                    icon={<Zap className="w-5 h-5 text-purple-600" />}
                    title="Generate Utility Bills"
                    description="For the current billing cycle"
                    bg="bg-purple-50"
                  />
                  <div className="h-px bg-slate-100 mx-4"></div>
                  <ActionCard 
                    icon={<Plus className="w-5 h-5 text-emerald-600" />}
                    title="Add New Announcement"
                    description="Broadcast to all residents"
                    bg="bg-emerald-50"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800">Recent Urgent Requests</h2>
                  <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All</button>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Request ID</th>
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student & Room</th>
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {REQUESTS.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-5 py-4 font-medium text-slate-900">{req.id}</td>
                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-800">{req.student}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Room {req.room}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              <span className="flex items-center gap-1.5">
                                {req.type === 'Maintenance' && <Settings className="w-3.5 h-3.5 text-slate-400" />}
                                {req.type === 'Room Transfer' && <BedDouble className="w-3.5 h-3.5 text-slate-400" />}
                                {req.type === 'Complaint' && <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />}
                                {req.type}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {req.status === 'Pending' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5"></span>
                                  Pending
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                  Resolved
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Subcomponents (đã bỏ TypeScript)
function NavItem({ icon, label, active = false }) {
  return (
    <button 
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
        ${active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <span className={active ? 'text-blue-600' : 'text-slate-400'}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </span>
      {label}
    </button>
  );
}

function ActionCard({ icon, title, description, bg }) {
  return (
    <button className="w-full text-left p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors rounded-lg group">
      <div className={`p-2.5 rounded-lg ${bg} shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
    </button>
  );
}