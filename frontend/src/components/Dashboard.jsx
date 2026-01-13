import { useState, useMemo } from 'react';
import { API_URL } from '../config';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import html2pdf from 'html2pdf.js';
import { 
  Upload, FileText, Loader2, CheckCircle2,
  Users, FileSignature, Trash2, Download,
  Edit2, Save, BarChart as ChartIcon, Eye, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

export default function Dashboard({
    paperName, setPaperName, files, setFiles, 
    solution, setSolution, currentPaperId, 
    dashboardView, setDashboardView,
    studentResults, loadingResults, fetchStudentResults,
    handleEvaluate, isEvaluating, evalReport,
    studentName, setStudentName, setStudentFile,
    handleDeleteStudent, openVerification,
    handleSaveEditedSolution
}) {

  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [editedSolution, setEditedSolution] = useState("");
  const [evalMode, setEvalMode] = useState(false);
  
  const [localIsSolving, setLocalIsSolving] = useState(false);
  const [solvingProgress, setSolvingProgress] = useState({ current: 0, total: 0 });

  const startEditing = () => {
    setEditedSolution(solution);
    setIsEditingSolution(true);
  };

  const saveEdit = async () => {
      await handleSaveEditedSolution(editedSolution);
      setIsEditingSolution(false);
      toast.success("Solution updated successfully");
  };

  const handleStreamingSolve = async () => {
      if (!files.length || !paperName) {
        toast.error("Please provide a name and upload files");
        return;
      }
      
      setLocalIsSolving(true);
      setSolvingProgress({ current: 0, total: 0 });
      setSolution(""); 
      
      const formData = new FormData();
      formData.append("name", paperName);
      Array.from(files).forEach(f => formData.append("files", f));

      try {
          const response = await fetch(`${API_URL}/solve`, {
              method: 'POST',
              body: formData,
          });

          if (!response.ok) throw new Error("Failed to start solving");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop(); 

              for (const line of lines) {
                  if (!line.trim()) continue;
                  try {
                      const data = JSON.parse(line);
                      
                      if (data.status === "solving_page") {
                          setSolvingProgress({ current: data.current, total: data.total });
                      } else if (data.status === "completed") {
                          setSolution(data.solution_text);
                          toast.success("Solution generated successfully");
                      }
                  } catch (e) {
                      console.error("JSON Parse Error", e);
                  }
              }
          }
      } catch (err) {
          console.error(err);
          toast.error("Error solving paper");
      } finally {
          setLocalIsSolving(false);
          setSolvingProgress({ current: 0, total: 0 });
      }
  };



// ... existing imports ...


  const handleDownloadPDF = () => {
    const element = document.getElementById('solution-content');
    if (!element) return;

    // Sanitize filename: remove special chars, spaces to underscores, keep valid chars
    const safeName = (paperName || 'solution')
        .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
        .replace(/_{2,}/g, '_')      // Replace multiple underscores
        .toLowerCase();
    
    const finalFileName = `${safeName}.pdf`;

    const opt = {
      margin:       10,
      filename:     finalFileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    toast.promise(
        html2pdf().set(opt).from(element).save(finalFileName),
        {
            loading: 'Generating PDF...',
            success: 'PDF downloaded successfully!',
            error: 'Failed to generate PDF'
        }
    );
  };

  const analyticsData = useMemo(() => {
    if (!studentResults.length) return [];
    return studentResults.map(s => {
        const parts = s.score.toString().split('/');
        let val = 0;
        if(parts.length === 2) val = (parseFloat(parts[0]) / parseFloat(parts[1])) * 100;
        else val = parseFloat(s.score) || 0;
        return { name: s.student_name, score: val };
    });
  }, [studentResults]);

  return (
    <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-500">
        <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
                <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <Sparkles size={18} className="text-primary-500"/> New Solution
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Paper Title</label>
                        <input type="text" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-medium placeholder:text-gray-400"
                            placeholder="e.g. Physics Final 2024" value={paperName} onChange={(e) => setPaperName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Question Paper</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 hover:border-primary-300 cursor-pointer relative transition-all group">
                            <input type="file" multiple accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={(e) => setFiles(e.target.files)} />
                            <div className="bg-primary-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-primary-600 group-hover:scale-110 transition-transform">
                                <Upload size={20} />
                            </div>
                            <p className="text-sm font-medium text-gray-600">{files.length > 0 ? <span className="text-primary-600 font-bold">{files.length} file(s) ready</span> : "Drop PDF or Images"}</p>
                            <p className="text-xs text-gray-400 mt-1">Up to 10MB per file</p>
                        </div>
                    </div>
                    <button onClick={handleStreamingSolve} disabled={localIsSolving || files.length === 0}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2">
                        {localIsSolving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} /> 
                                {solvingProgress.total > 0 ? `Solving Page ${solvingProgress.current}/${solvingProgress.total}...` : "Preparing AI..."}
                            </>
                        ) : "Generate Solution"}
                    </button>
                </div>
            </div>

            {solution && (
                <>
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex bg-gray-100/50 p-1 rounded-lg">
                    {['solution', 'students', 'analytics'].map((view) => (
                        <button key={view} onClick={() => setDashboardView(view)}
                            className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${dashboardView === view ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                            {view === 'solution' ? 'Ans Key' : view === 'students' ? 'Results' : 'Charts'}
                        </button>
                    ))}
                  </div>
                </div>
                {dashboardView === 'solution' && (
                    <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-6 rounded-2xl shadow-xl shadow-primary-900/10 text-white">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><CheckCircle2 size={18}/> Grade Papers</h3>
                        <p className="text-primary-100 text-sm mb-4">Evaluate student submissions against this answer key.</p>
                        <button onClick={() => setEvalMode(!evalMode)} className="w-full bg-white text-primary-700 hover:bg-primary-50 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm">
                            {evalMode ? "Close Grader" : "Start Grading"}
                        </button>
                    </div>
                )}
                </>
            )}
        </div>

        <div className="col-span-12 lg:col-span-8">
            {dashboardView === 'solution' && (
            <>
                {evalMode && (
                <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-200/50 border border-primary-100 mb-6 animate-in slide-in-from-top-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"/>
                    <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Users size={20} className="text-primary-500"/> Submit Student Work</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="text" placeholder="Student Name" className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-gray-400" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                        <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setStudentFile(e.target.files[0])} />
                            <FileSignature size={18} className="text-gray-400"/>
                            <span className="text-sm text-gray-500 truncate">{studentName ? (studentName + "'s File") : "Upload Answer Sheet"}</span>
                        </label>
                    </div>
                    <button onClick={handleEvaluate} disabled={isEvaluating} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50 flex items-center gap-2 transition-all">
                        {isEvaluating && <Loader2 className="animate-spin" size={14}/>} {isEvaluating ? "AI Gradle in Progress..." : "Submit for Evaluation"}
                    </button>
                    {evalReport && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h5 className="font-bold text-sm text-green-700 mb-2 flex items-center gap-2"><CheckCircle2 size={16}/> Evaluation Preview</h5>
                            <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-xl border border-gray-100/50"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{evalReport}</ReactMarkdown></div>
                        </div>
                    )}
                </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col relative overflow-hidden">
                {solution ? (
                    <div className="flex-1 flex flex-col">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <h1 className="text-2xl font-bold text-gray-900">{paperName}</h1>
                            <div className="flex gap-2">
                                {!isEditingSolution ? (
                                    <>
                                    <button onClick={startEditing} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"><Edit2 size={16} /> Edit</button>
                                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"><Download size={16} /> Export</button>
                                    </>
                                ) : (
                                    <>
                                    <button onClick={() => setIsEditingSolution(false)} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-900 text-sm font-medium">Cancel</button>
                                    <button onClick={saveEdit} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md shadow-green-600/20"><Save size={16} /> Save Changes</button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div id="solution-content" className="p-8 flex-1 overflow-auto">
                            {isEditingSolution ? (
                                <textarea className="w-full h-full min-h-[500px] p-6 font-mono text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none leading-relaxed" value={editedSolution} onChange={(e) => setEditedSolution(e.target.value)} />
                            ) : (
                                <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-800"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{solution}</ReactMarkdown></div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 bg-gray-50/50">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <FileText size={48} className="opacity-50 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-400 mb-2">Workspace Empty</h3>
                        <p className="text-sm text-gray-400 max-w-xs text-center">Select a paper from your history or create a new solution to get started.</p>
                    </div>
                )}
                </div>
            </>
            )}

            {dashboardView === 'students' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users size={20} className="text-primary-600"/> Class Performance</h2>
                    <button onClick={fetchStudentResults} className="text-sm font-medium text-primary-600 hover:text-primary-800 px-3 py-1 bg-primary-50 rounded-lg transition-colors">Refresh List</button>
                </div>
                {loadingResults ? (
                    <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary-500" size={32}/></div>
                ) : (
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider"><tr><th className="p-5">Student</th><th className="p-5">Score</th><th className="p-5">Actions</th><th className="p-5">Evidence</th><th className="p-5"></th></tr></thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {studentResults.map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="p-5 font-semibold text-gray-900">{student.student_name}</td>
                                <td className="p-5"><span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md font-bold text-xs">{student.score}</span></td>
                                <td className="p-5"><button onClick={() => openVerification(student)} className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"><Eye size={14}/> Verify</button></td>
                                <td className="p-5 flex gap-3 text-gray-400">
                                {student.submission_url && <a href={student.submission_url} target="_blank" className="hover:text-primary-600 transition-colors tooltip" title="View Submission"><FileSignature size={18}/></a>}
                                {student.report_url && <a href={student.report_url} target="_blank" className="hover:text-primary-600 transition-colors tooltip" title="View Report"><FileText size={18}/></a>}
                                </td>
                                <td className="p-5 text-right"><button onClick={() => handleDeleteStudent(student.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-full hover:bg-red-50"><Trash2 size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                )}
                </div>
            )}

            {dashboardView === 'analytics' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[500px] p-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2"><ChartIcon className="text-purple-600"/> Analytics Dashboard</h2>
                    {studentResults.length > 0 ? (
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} /><Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} /><Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={60} /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <div className="text-center text-gray-400 py-32 bg-gray-50 rounded-xl border border-dashed border-gray-200">No student data available for analytics yet.</div>}
                </div>
            )}
        </div>
    </div>
  );
}