import { LayoutDashboard, PlusCircle, FileOutput, History, GraduationCap, Settings, LogOut, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create Paper', icon: PlusCircle },
    { id: 'my_papers', label: 'Generated Papers', icon: FileOutput },
    { id: 'history', label: 'Solved Papers', icon: History },
  ];

  return (
    <aside className={`w-72 bg-gray-900 text-white flex flex-col fixed h-full shadow-2xl z-30 font-sans border-r border-gray-800 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-8 pb-8 flex justify-between items-start">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-white">
          <div className="p-2 bg-primary-600 rounded-lg shadow-lg shadow-primary-900/50">
            <GraduationCap className="text-white" size={24} />
          </div>
          <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">TeacherAI</span>
        </h1>
        {/* Mobile Close Button */}
        <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1">
            <X size={24} />
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden
                ${isActive ? 'text-white shadow-lg shadow-primary-900/20' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary-600 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <span className="relative z-10 flex items-center gap-3 font-medium text-sm tracking-wide">
                <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} /> 
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-sm">
                NV
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Neeti Verma</p>
                <p className="text-xs text-gray-400 truncate">Senior Faculty</p>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
             <button className="flex-1 p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex justify-center"><Settings size={18}/></button>
             <button className="flex-1 p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors flex justify-center"><LogOut size={18}/></button>
          </div>
      </div>
    </aside>
  );
}