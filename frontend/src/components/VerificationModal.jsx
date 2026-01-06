import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

export default function VerificationModal({ student, onClose, onSave }) {
  const [verifyScore, setVerifyScore] = useState(student.score);
  const [verifyReportText, setVerifyReportText] = useState("Loading report...");

  useEffect(() => {
    const fetchReport = async () => {
        try {
            const response = await axios.get(student.report_url);
            setVerifyReportText(response.data);
        } catch (e) {
            setVerifyReportText("Error loading report text.");
        }
    };
    if(student.report_url) fetchReport();
  }, [student]);

  const handleSave = () => {
      onSave(student.id, verifyScore, verifyReportText);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden">
            <div className="w-1/2 bg-gray-100 p-4 overflow-auto flex items-center justify-center border-r">
                <img src={student.submission_url} alt="Student Submission" className="max-w-full shadow-lg" />
            </div>
            <div className="w-1/2 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div><h3 className="font-bold text-lg">Verifying: {student.student_name}</h3><p className="text-xs text-gray-500">Manual Override Mode</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Adjusted Score</label>
                        <input type="text" className="w-full p-2 border rounded font-bold text-lg text-blue-700" value={verifyScore} onChange={(e) => setVerifyScore(e.target.value)} />
                    </div>
                    <div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-2">Evaluation Report (Markdown)</label>
                        <textarea className="w-full h-96 p-4 border rounded font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={verifyReportText} onChange={(e) => setVerifyReportText(e.target.value)} />
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-sm">Save & Update Grade</button>
                </div>
            </div>
        </div>
    </div>
  );
}