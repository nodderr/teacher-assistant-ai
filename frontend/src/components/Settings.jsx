import { useState } from 'react';
import { User, Moon, Sun, Monitor, Trash2, Download, Bell, Save } from 'lucide-react';

export default function Settings({ 
  userProfile, 
  setUserProfile, 
  theme, 
  setTheme, 
  onClearHistory, 
  onClearGenerated,
  onExportData 
}) {
  const [activeSection, setActiveSection] = useState('general');
  // Local state for profile form to allow "Save" action
  const [localName, setLocalName] = useState(userProfile.name);
  const [localRole, setLocalRole] = useState(userProfile.role);

  const handleSaveProfile = () => {
    setUserProfile({ name: localName, role: localRole });
    // In a real app, you might save to backend here
    alert("Profile saved!"); 
  };

  const sections = [
    { id: 'general', label: 'General', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'data', label: 'Data Management', icon: Save },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Settings</h2>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                activeSection === section.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <section.icon size={18} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
          
          {/* GENERAL SETTINGS */}
          {activeSection === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Profile Information</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                    <input 
                      type="text" 
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role / Title</label>
                    <input 
                      type="text" 
                      value={localRole}
                      onChange={(e) => setLocalRole(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Save size={18}/> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE SETTINGS */}
          {activeSection === 'appearance' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Theme</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'light' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-3 bg-white rounded-full shadow-sm text-yellow-500">
                      <Sun size={24} />
                    </div>
                    <span className="font-medium text-gray-700">Light</span>
                  </button>

                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'dark' ? 'border-primary-600 bg-gray-800 text-white' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-3 bg-gray-700 rounded-full shadow-sm text-blue-300">
                      <Moon size={24} />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Dark</span>
                  </button>

                  <button 
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'system' ? 'border-primary-600 bg-gray-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                     <div className="p-3 bg-gray-200 rounded-full shadow-sm text-gray-600">
                      <Monitor size={24} />
                    </div>
                    <span className="font-medium text-gray-700">System</span>
                  </button>
                </div>
              </div>
             </div>
          )}

          {/* DATA MANAGEMENT */}
          {activeSection === 'data' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Data Expiration & Cleanup</h3>
                <p className="text-gray-600 mb-6 text-sm">Manage your local data. Caution: These actions cannot be undone.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div>
                      <h4 className="font-semibold text-red-900">Clear Solved Papers History</h4>
                      <p className="text-xs text-red-700 mt-1">Removes all items from the History tab.</p>
                    </div>
                    <button 
                      onClick={onClearHistory}
                      className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Clear History
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                     <div>
                      <h4 className="font-semibold text-red-900">Clear Generated Papers</h4>
                      <p className="text-xs text-red-700 mt-1">Removes all generated papers.</p>
                    </div>
                    <button 
                      onClick={onClearGenerated}
                      className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Clear Papers
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mt-8">
                     <div>
                      <h4 className="font-semibold text-gray-900">Export Data Backup</h4>
                      <p className="text-xs text-gray-600 mt-1">Download a JSON file of your current workspace.</p>
                    </div>
                    <button 
                      onClick={onExportData}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Download size={16} /> Export JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
