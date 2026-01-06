import { LayoutDashboard, PlusCircle, FileOutput, History, GraduationCap } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create Paper', icon: PlusCircle },
    { id: 'my_papers', label: 'Generated Papers', icon: FileOutput },
    { id: 'history', label: 'Solved Papers', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-20">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="text-blue-400" /> 
          Neeti Verma
        </h1>
        <p className="text-xs text-slate-400 mt-1">Teacher Assistant Portal</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium
              ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <item.icon size={18} /> {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}