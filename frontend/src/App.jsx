import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import html2pdf from 'html2pdf.js';
import 'katex/dist/katex.min.css';
import { 
  Upload, FileText, Loader2, AlertCircle, History, 
  LayoutDashboard, GraduationCap, ChevronRight, CheckCircle2,
  ExternalLink, Users, FileSignature, Trash2, Download
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  // -- STATE: Solver --
  const [currentPaperId, setCurrentPaperId] = useState(null); 
  const [files, setFiles] = useState([]); // Changed to array
  const [paperName, setPaperName] = useState("");
  const [solution, setSolution] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  
  // -- STATE: Dashboard View --
  const [dashboardView, setDashboardView] = useState('solution'); 

  // -- STATE: History --
  const [historyItems, setHistoryItems] = useState([]);
  
  // -- STATE: Evaluation --
  const [evalMode, setEvalMode] = useState(false);
  const [studentFile, setStudentFile] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [evalReport, setEvalReport] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // -- STATE: Class Results --
  const [studentResults, setStudentResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // -- STATE: Shared --
  const [error, setError] = useState("");

  // --- API CALLS ---

  const handleSolve = async () => {
    if (files.length === 0 || !paperName) {
      setError("Please provide at least one file and a paper name.");
      return;
    }
    setIsSolving(true);
    setError("");
    setSolution(""); 
    setEvalMode(false);
    setEvalReport("");
    setCurrentPaperId(null);

    const formData = new FormData();
    // Append all selected files to formData
    Array.from(files).forEach((file) => {
        formData.append('files', file);
    });
    formData.append('name', paperName);

    try {
      const response = await axios.post('http://127.0.0.1:8000/solve', formData);
      setSolution(response.data.solution_text);
      setCurrentPaperId(response.data.paper_id);
      setDashboardView('solution');
    } catch (err) {
      setError("Failed to solve paper. Please check the backend connection.");
      console.error(err);
    } finally {
      setIsSolving(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('solution-content');
    const opt = {
      margin:       [0.5, 0.5, 0.5, 0.5],
      filename:     `${paperName || 'solution'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/history');
      setHistoryItems(response.data || []);
    } catch (err) {
      console.error("History fetch error", err);
    }
  };

  const loadFromHistory = async (item) => {
    setEvalMode(false);
    setEvalReport("");
    setPaperName(item.name);
    setCurrentPaperId(item.id); 
    
    setActiveTab('dashboard');
    setDashboardView('solution');
    setIsSolving(true); 
    
    try {
      const response = await axios.get(item.solution_url);
      setSolution(response.data);
    } catch (err) {
      setError("Could not load history details.");
    } finally {
      setIsSolving(false);
    }
  };

  // --- DELETE FUNCTIONS ---
  const handleDeletePaper = async (e, id) => {
    e.stopPropagation(); 
    if(!confirm("Are you sure? This will delete the paper and all student submissions.")) return;
    
    try {
        await axios.delete(`http://127.0.0.1:8000/history/${id}`);
        setHistoryItems(prev => prev.filter(item => item.id !== id));
        if (currentPaperId === id) {
            setSolution("");
            setPaperName("");
            setCurrentPaperId(null);
            setStudentResults([]);
        }
    } catch (err) {
        alert("Failed to delete paper");
    }
  };

  const handleDeleteStudent = async (id) => {
    if(!confirm("Delete this student submission?")) return;
    try {
        await axios.delete(`http://127.0.0.1:8000/student/${id}`);
        setStudentResults(prev => prev.filter(item => item.id !== id));
    } catch (err) {
        alert("Failed to delete submission");
    }
  };

  const fetchStudentResults = async () => {
    if (!currentPaperId) return;
    setLoadingResults(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/paper/${currentPaperId}/students`);
      setStudentResults(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleEvaluate = async () => {
    if (!studentFile || !studentName || !currentPaperId) {
      setError("Missing information for evaluation.");
      return;
    }
    setIsEvaluating(true);
    
    const formData = new FormData();
    formData.append('paper_id', currentPaperId);
    formData.append('student_file', studentFile);
    formData.append('student_name', studentName);
    formData.append('reference_solution', solution); 

    try {
      const response = await axios.post('http://127.0.0.1:8000/evaluate', formData);
      setEvalReport(response.data.evaluation_report);
      fetchStudentResults(); // Refresh list
    } catch (err) {
      setError("Evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard' && dashboardView === 'students' && currentPaperId) {
      fetchStudentResults();
    }
  }, [dashboardView, currentPaperId]);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="text-blue-400" /> 
            EduSolver AI
          </h1>
          <p className="text-xs text-slate-400 mt-1">Teacher's Assistant</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium
              ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium
              ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <History size={18} /> Solved Papers
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        
        {/* TOP BAR */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' ? 'Workspace' : 'Paper Archive'}
            </h2>
            <p className="text-gray-500 text-sm">Manage your question papers and evaluations</p>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded shadow-sm">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* --- VIEW: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Controls */}
            <div className="col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">New Solution</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                      placeholder="e.g. Physics Final 2024"
                      value={paperName}
                      onChange={(e) => setPaperName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Paper (PDF or Images)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        multiple // Allow multiple files
                        accept="image/*,application/pdf" // Allow PDF and Image
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => setFiles(e.target.files)} // Store FileList
                      />
                      <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-xs text-gray-500">
                        {files.length > 0 ? `${files.length} file(s) selected` : "Upload Images or PDF"}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={handleSolve}
                    disabled={isSolving || files.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isSolving ? <Loader2 className="animate-spin" size={16} /> : "Generate Solution"}
                  </button>
                </div>
              </div>

              {/* Toggle: Evaluation / Results */}
              {solution && currentPaperId && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex gap-2">
                    <button 
                       onClick={() => setDashboardView('solution')}
                       className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${dashboardView === 'solution' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Answer Key
                    </button>
                    <button 
                       onClick={() => setDashboardView('students')}
                       className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${dashboardView === 'students' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Class Results
                    </button>
                  </div>
                </div>
              )}

              {/* Action: Evaluate (Only visible in Solution view) */}
              {solution && dashboardView === 'solution' && (
                <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
                  <h3 className="text-lg font-semibold mb-3 text-indigo-900 flex items-center gap-2">
                    <CheckCircle2 size={18}/> Student Evaluation
                  </h3>
                  <button 
                    onClick={() => setEvalMode(!evalMode)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded font-medium text-sm transition-all"
                  >
                    {evalMode ? "Close Evaluator" : "Grade Student Paper"}
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Output Area */}
            <div className="col-span-8">
              
              {/* --- VIEW: ANSWER KEY --- */}
              {dashboardView === 'solution' && (
                <>
                  {evalMode && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-200 mb-6 animate-in slide-in-from-top-4">
                      <h4 className="font-bold text-lg text-gray-800 mb-4">Submit Student Work</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <input 
                          type="text" 
                          placeholder="Student Name"
                          className="p-2 border rounded text-sm"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                        />
                        <input 
                          type="file"
                          accept="image/*"
                          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          onChange={(e) => setStudentFile(e.target.files[0])}
                        />
                      </div>
                      <button 
                        onClick={handleEvaluate}
                        disabled={isEvaluating}
                        className="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isEvaluating ? "Grading..." : "Submit & Grade"}
                      </button>

                      {evalReport && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <div className="prose prose-sm max-w-none prose-headings:text-indigo-900 prose-table:border prose-th:bg-gray-50">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm, remarkMath]} 
                              rehypePlugins={[rehypeKatex]}
                            >
                              {evalReport}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                    {solution ? (
                      <div className="p-8">
                        {/* Header with Download Button */}
                        <div className="flex items-center justify-between border-b pb-4 mb-6">
                          <h1 className="text-2xl font-bold text-gray-900">{paperName}</h1>
                          <div className="flex gap-2">
                             <button 
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                             >
                                <Download size={16} /> Save PDF
                             </button>
                             <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">Solved</span>
                          </div>
                        </div>
                        
                        {/* Content Wrapper for PDF Generation */}
                        <div id="solution-content">
                            <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-blue-600 prose-pre:bg-slate-900 prose-pre:text-slate-50">
                            <ReactMarkdown 
                                remarkPlugins={[remarkMath, remarkGfm]} 
                                rehypePlugins={[rehypeKatex]}
                            >
                                {solution}
                            </ReactMarkdown>
                            </div>
                        </div>

                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12">
                        <FileText size={64} className="mb-4 opacity-20" />
                        <p>Select a paper from history or upload a new one.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* --- VIEW: CLASS RESULTS --- */}
              {dashboardView === 'students' && (
                 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                       <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                         <Users size={20} className="text-blue-600"/> Class Performance
                       </h2>
                       <button onClick={fetchStudentResults} className="text-sm text-blue-600 hover:underline">Refresh</button>
                    </div>
                    
                    {loadingResults ? (
                      <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                          <tr>
                            <th className="p-4">Student Name</th>
                            <th className="p-4">Marks</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Reports</th>
                            <th className="p-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {studentResults.length === 0 ? (
                             <tr><td colSpan="5" className="p-8 text-center text-gray-400">No students graded yet for this paper.</td></tr>
                          ) : (
                             studentResults.map((student) => (
                               <tr key={student.id} className="hover:bg-gray-50/50 group">
                                 <td className="p-4 font-medium text-gray-900">{student.student_name}</td>
                                 <td className="p-4">
                                   <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">{student.score || "N/A"}</span>
                                 </td>
                                 <td className="p-4 text-gray-500">{new Date(student.created_at).toLocaleDateString()}</td>
                                 <td className="p-4 flex gap-3">
                                   {student.submission_url && (
                                     <a href={student.submission_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-600 flex items-center gap-1">
                                       <FileSignature size={14}/> Paper
                                     </a>
                                   )}
                                   {student.report_url && (
                                     <a href={student.report_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-600 flex items-center gap-1">
                                       <FileText size={14}/> Report
                                     </a>
                                   )}
                                 </td>
                                 <td className="p-4 text-right">
                                     <button 
                                        onClick={() => handleDeleteStudent(student.id)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                        title="Delete Submission"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                 </td>
                               </tr>
                             ))
                          )}
                        </tbody>
                      </table>
                    )}
                 </div>
              )}

            </div>
          </div>
        )}

        {/* --- VIEW: HISTORY --- */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Paper Name</th>
                  <th className="p-4">Date Solved</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 font-medium text-gray-800">{item.name}</td>
                    <td className="p-4 text-gray-500 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => loadFromHistory(item)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                        >
                          View Solution <ChevronRight size={16} />
                        </button>
                        
                        {item.original_url && (
                          <a 
                            href={item.original_url}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-medium"
                          >
                            <ExternalLink size={14} /> Original
                          </a>
                        )}

                        <button 
                            onClick={(e) => handleDeletePaper(e, item.id)}
                            className="text-gray-400 hover:text-red-600 text-sm font-medium flex items-center gap-1"
                            title="Delete Paper"
                        >
                            <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;