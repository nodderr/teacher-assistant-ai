import { ExternalLink, Trash2, ChevronRight } from 'lucide-react';

export default function HistoryList({ items, onLoad, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider"><th className="p-4">Paper Name</th><th className="p-4">Date Solved</th><th className="p-4">Actions</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="p-4 font-medium text-gray-800">{item.name}</td>
              <td className="p-4 text-gray-500 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
              <td className="p-4">
                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onLoad(item)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1">View Solution <ChevronRight size={16} /></button>
                  {item.original_url && <a href={item.original_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-medium"><ExternalLink size={14} /> Original</a>}
                  <button onClick={(e) => onDelete(e, item.id)} className="text-gray-400 hover:text-red-600 text-sm font-medium flex items-center gap-1"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}