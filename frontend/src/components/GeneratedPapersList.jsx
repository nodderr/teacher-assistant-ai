import { ExternalLink, Trash2 } from 'lucide-react';

export default function GeneratedPapersList({ papers, onLoad, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
     <table className="w-full text-left border-collapse">
       <thead><tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider"><th className="p-4">Paper Name</th><th className="p-4">Board & Subject</th><th className="p-4">Created At</th><th className="p-4">Actions</th></tr></thead>
       <tbody className="divide-y divide-gray-100">
         {papers.length === 0 ? (
            <tr><td colSpan="4" className="p-8 text-center text-gray-400">No papers generated yet.</td></tr>
         ) : (
            papers.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 font-medium text-gray-800">{item.name}</td>
                  {/* Updated Column to show Board */}
                  <td className="p-4 text-sm text-gray-600">
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs mr-2">{item.board || 'CBSE'}</span>
                    {item.subject} ({item.class_level})
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onLoad(item)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1">Open <ExternalLink size={16} /></button>
                      <button onClick={(e) => onDelete(e, item.id)} className="text-gray-400 hover:text-red-600 text-sm font-medium flex items-center gap-1"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
         )}
       </tbody>
     </table>
   </div>
  );
}