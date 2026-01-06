import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw'; // Import this
import html2pdf from 'html2pdf.js';
import 'katex/dist/katex.min.css';
import { 
  Upload, FileText, Loader2, AlertCircle, History, 
  LayoutDashboard, GraduationCap, ChevronRight, CheckCircle2,
  ExternalLink, Users, FileSignature, Trash2, Download,
  Edit2, Save, X, BarChart as ChartIcon, Eye, PlusCircle, BookOpen, Layers
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- CONSTANTS: CBSE DATA ---
const CBSE_DATA = {
    classes: ["Class 10"],
    subjects: {
        "Class 10": ["Science", "Mathematics"]
    },
    chapters: {
        "Science": {
            "Biology": [
                "Life Processes", "Control and Coordination", "How do Organisms Reproduce", 
                "Heredity and Evolution", "Environment", "Resources"
            ],
            "Chemistry": [
                "Chemical Reactions and Equations", "Acids, Bases and Salts", 
                "Metals and Non-metals", "Carbon and its Compounds", "Sources of Energy"
            ],
            "Physics": [
                "Light – Reflection and Refraction", "The Human Eye and the Colourful World", 
                "Electricity", "Magnetic Effects of Electric Current"
            ]
        },
        "Mathematics": {
            "Maths": [
                "Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", 
                "Quadratic Equations", "Arithmetic Progressions", "Triangles", 
                "Coordinate Geometry", "Introduction to Trigonometry", "Trigonometric Identities", 
                "Heights and Distances", "Circles", "Constructions", "Areas Related to Circles", 
                "Surface Areas and Volumes", "Statistics", "Probability"
            ]
        }
    }
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  // -- STATE: Generator (CBSE) --
  const [genClass, setGenClass] = useState("Class 10");
  const [genSubject, setGenSubject] = useState("");
  const [genType, setGenType] = useState(""); 
  const [genChapters, setGenChapters] = useState([]);
  const [genDifficulty, setGenDifficulty] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);

  // -- STATE: Solver --
  const [currentPaperId, setCurrentPaperId] = useState(null); 
  const [files, setFiles] = useState([]); 
  const [paperName, setPaperName] = useState("");
  const [solution, setSolution] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [progress, setProgress] = useState(0); 
  
  // -- STATE: Editing Solution --
  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [editedSolution, setEditedSolution] = useState("");

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

  // -- STATE: Verification (Human in Loop) --
  const [verifyingStudent, setVerifyingStudent] = useState(null); 
  const [verifyScore, setVerifyScore] = useState("");
  const [verifyReport, setVerifyReport] = useState("");
  const [verifyReportText, setVerifyReportText] = useState(""); 

  // -- STATE: Shared --
  const [error, setError] = useState("");

  // --- PROGRESS SIMULATOR ---
  useEffect(() => {
    let interval;
    if (isSolving || isEvaluating || isGenerating) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 10 : prev));
      }, 800);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [isSolving, isEvaluating, isGenerating]);

  // --- API CALLS ---

  const handleGeneratePaper = async () => {
      if(!genSubject) { setError("Select a subject"); return; }
      if(genType === 'chapterwise' && genChapters.length === 0) { setError("Select at least one chapter"); return; }
      
      setIsGenerating(true);
      setError("");
      setSolution("");
      setCurrentPaperId(null);
      
      try {
          const response = await axios.post('http://127.0.0.1:8000/generate-paper', {
              class_level: genClass,
              subject: genSubject,
              paper_type: genType,
              chapters: genType === 'complete' ? [] : genChapters,
              difficulty: genDifficulty
          });
          
          setSolution(response.data.text);
          setCurrentPaperId(response.data.paper_id);
          setPaperName(`${genSubject} Generated Paper`);
          setActiveTab('dashboard');
          setDashboardView('solution');
          setGenChapters([]);
          setGenType("");
      } catch (err) {
          setError("Failed to generate paper.");
          console.error(err);
      } finally {
          setIsGenerating(false);
      }
  };

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

  const handleSaveEditedSolution = async () => {
    if (!currentPaperId) return;
    try {
      await axios.put(`http://127.0.0.1:8000/paper/${currentPaperId}/solution`, {
        text: editedSolution
      });
      setSolution(editedSolution);
      setIsEditingSolution(false);
    } catch (err) {
      setError("Failed to save changes.");
    }
  };

  const startEditing = () => {
    setEditedSolution(solution);
    setIsEditingSolution(true);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('solution-content');
    if (!element) {
        setError("Content not found to generate PDF");
        return;
    }

    const clone = element.cloneNode(true);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1000px'; 
    container.style.background = 'white'; 
    container.style.zIndex = '-1';
    clone.style.width = '100%';
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.maxHeight = 'none';

    container.appendChild(clone);
    document.body.appendChild(container);

    const opt = {
      margin:       [0.5, 0.5, 0.5, 0.5],
      filename:     `${paperName || 'solution'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, scrollY: 0, windowWidth: 1000 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(clone).save().then(() => document.body.removeChild(container))
        .catch((err) => { document.body.removeChild(container); });
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
    
    const targetUrl = item.solution_url || item.original_url;
    
    setActiveTab('dashboard');
    setDashboardView('solution');
    setIsSolving(true); 
    
    try {
      const response = await axios.get(targetUrl);
      setSolution(response.data);
    } catch (err) {
        if(item.solution_url === null && !item.original_url.endsWith('.md')) {
            setSolution("");
            setError("This paper hasn't been solved yet. Please re-upload to solve.");
        } else {
            setError("Could not load paper content.");
        }
    } finally {
      setIsSolving(false);
    }
  };

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
      fetchStudentResults(); 
    } catch (err) {
      setError("Evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const openVerification = async (student) => {
    setVerifyingStudent(student);
    setVerifyScore(student.score);
    setVerifyReport("Loading report...");
    setVerifyReportText("");
    try {
        const response = await axios.get(student.report_url);
        setVerifyReportText(response.data);
    } catch (e) {
        setVerifyReportText("Error loading report text.");
    }
  };

  const saveVerification = async () => {
    if(!verifyingStudent) return;
    try {
        await axios.put(`http://127.0.0.1:8000/student/${verifyingStudent.id}`, {
            score: verifyScore,
            report: verifyReportText
        });
        setStudentResults(prev => prev.map(s => s.id === verifyingStudent.id ? {...s, score: verifyScore} : s));
        setVerifyingStudent(null);
    } catch (e) {
        alert("Failed to update student grade.");
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard' && (dashboardView === 'students' || dashboardView === 'analytics') && currentPaperId) {
      fetchStudentResults();
    }
  }, [dashboardView, currentPaperId]);

  const analyticsData = useMemo(() => {
    if (!studentResults.length) return [];
    return studentResults.map(s => {
        const parts = s.score.toString().split('/');
        let val = 0;
        if(parts.length === 2) {
            val = (parseFloat(parts[0]) / parseFloat(parts[1])) * 100;
        } else {
            val = parseFloat(s.score) || 0;
        }
        return { name: s.student_name, score: val };
    });
  }, [studentResults]);

  const handleChapterToggle = (chapter) => {
      setGenChapters(prev => 
          prev.includes(chapter) ? prev.filter(c => c !== chapter) : [...prev, chapter]
      );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="text-blue-400" /> 
            Neeti Verma
          </h1>
          <p className="text-xs text-slate-400 mt-1">Teacher Assistant Portal</p>
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
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium
              ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <PlusCircle size={18} /> Create Paper
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
      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen relative">
        
        {(isSolving || isEvaluating || isGenerating) && (
            <div className="fixed top-0 left-64 right-0 h-1 bg-blue-100 z-50">
                <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
        )}

        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' ? 'Workspace' : activeTab === 'create' ? 'Paper Generator' : 'Paper Archive'}
            </h2>
            <p className="text-gray-500 text-sm">
                {activeTab === 'create' ? 'AI-powered question paper creation for CBSE' : 'Manage your question papers and evaluations'}
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded shadow-sm">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* --- VIEW: CREATE PAPER CBSE --- */}
        {activeTab === 'create' && (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="space-y-8">
                    {/* Step 1: Class */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. Select Class</label>
                        <select 
                            className="w-full p-3 border rounded-lg bg-gray-50 text-gray-800 font-medium"
                            value={genClass}
                            onChange={(e) => setGenClass(e.target.value)}
                        >
                            {CBSE_DATA.classes.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Step 2: Subject */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. Select Subject</label>
                        <div className="grid grid-cols-2 gap-4">
                            {CBSE_DATA.subjects[genClass].map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => { setGenSubject(sub); setGenChapters([]); setGenType(""); }}
                                    className={`p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                                        genSubject === sub 
                                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                                >
                                    <BookOpen size={20} /> <span className="font-bold">{sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 3: Type (Only if subject selected) */}
                    {genSubject && (
                        <div className="animate-in fade-in slide-in-from-top-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">3. Paper Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                {['Complete Syllabus', 'Chapterwise'].map(type => {
                                    const val = type.toLowerCase().split(' ')[0];
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setGenType(val)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                                                genType === val
                                                ? 'border-purple-600 bg-purple-50 text-purple-700' 
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                        >
                                            <Layers size={20} /> <span className="font-bold">{type}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Chapters (Only if Chapterwise) */}
                    {genType === 'chapterwise' && genSubject && (
                         <div className="animate-in fade-in slide-in-from-top-4">
                             <label className="block text-sm font-bold text-gray-700 mb-2">4. Select Chapters</label>
                             <div className="bg-gray-50 p-6 rounded-lg border max-h-96 overflow-y-auto">
                                 {Object.entries(CBSE_DATA.chapters[genSubject]).map(([section, chapters]) => (
                                     <div key={section} className="mb-4">
                                         <h4 className="font-bold text-xs uppercase text-gray-500 mb-2 border-b pb-1">{section}</h4>
                                         <div className="grid grid-cols-2 gap-2">
                                             {chapters.map(chap => (
                                                 <label key={chap} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                                                     <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                        checked={genChapters.includes(chap)}
                                                        onChange={() => handleChapterToggle(chap)}
                                                     />
                                                     <span className="text-sm">{chap}</span>
                                                 </label>
                                             ))}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                             <p className="text-right text-xs text-gray-500 mt-2">{genChapters.length} chapters selected</p>
                         </div>
                    )}

                    {/* Step 5: Difficulty */}
                    {genType && (
                        <div className="animate-in fade-in slide-in-from-top-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between">
                                <span>5. Difficulty Level</span>
                                <span className="text-blue-600">{genDifficulty}%</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={genDifficulty}
                                onChange={(e) => setGenDifficulty(e.target.value)}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>Easy</span>
                                <span>Medium</span>
                                <span>Hard</span>
                                <span>Olympiad</span>
                            </div>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button 
                        onClick={handleGeneratePaper}
                        disabled={isGenerating || !genType || (genType === 'chapterwise' && genChapters.length === 0)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-8"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" /> : "Generate Question Paper"}
                    </button>
                </div>
            </div>
        )}

        {/* --- VIEW: DASHBOARD & OTHERS (No Changes except updated Markdown Renderer) --- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">New Solution</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="e.g. Physics Final 2024"
                      value={paperName}
                      onChange={(e) => setPaperName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Paper</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer relative">
                      <input 
                        type="file" multiple accept="image/*,application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => setFiles(e.target.files)} 
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-medium text-sm flex justify-center items-center gap-2"
                  >
                    {isSolving ? <Loader2 className="animate-spin" size={16} /> : "Generate Solution"}
                  </button>
                </div>
              </div>

              {solution && currentPaperId && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {['solution', 'students', 'analytics'].map((view) => (
                        <button 
                            key={view}
                            onClick={() => setDashboardView(view)}
                            className={`flex-1 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all ${
                                dashboardView === view ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {view === 'solution' ? 'Key' : view === 'students' ? 'Results' : 'Analytics'}
                        </button>
                    ))}
                  </div>
                </div>
              )}

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

            <div className="col-span-8">
              {dashboardView === 'solution' && (
                <>
                  {evalMode && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-200 mb-6 animate-in slide-in-from-top-4">
                      <h4 className="font-bold text-lg text-gray-800 mb-4">Submit Student Work</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="text" placeholder="Student Name" className="p-2 border rounded text-sm"
                          value={studentName} onChange={(e) => setStudentName(e.target.value)}
                        />
                        <input type="file" accept="image/*" className="text-sm text-gray-500"
                          onChange={(e) => setStudentFile(e.target.files[0])}
                        />
                      </div>
                      <button onClick={handleEvaluate} disabled={isEvaluating}
                        className="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      >
                         {isEvaluating && <Loader2 className="animate-spin" size={14}/>}
                         {isEvaluating ? "Grading..." : "Submit & Grade"}
                      </button>

                      {evalReport && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                           <h5 className="font-bold text-sm text-green-700 mb-2">Current Evaluation Preview:</h5>
                           <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded border">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{evalReport}</ReactMarkdown>
                           </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                    {solution ? (
                      <div className="p-8">
                        <div className="flex items-center justify-between border-b pb-4 mb-6">
                          <h1 className="text-2xl font-bold text-gray-900">{paperName}</h1>
                          <div className="flex gap-2">
                             {!isEditingSolution ? (
                                <>
                                    <button onClick={startEditing} className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium">
                                        <Edit2 size={16} /> Edit Key
                                    </button>
                                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium">
                                        <Download size={16} /> PDF
                                    </button>
                                </>
                             ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditingSolution(false)} className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-900 text-sm">Cancel</button>
                                    <button onClick={handleSaveEditedSolution} className="flex items-center gap-2 px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold shadow-sm">
                                        <Save size={16} /> Save
                                    </button>
                                </div>
                             )}
                          </div>
                        </div>
                        
                        <div id="solution-content">
                            {isEditingSolution ? (
                                <textarea className="w-full h-[600px] p-4 font-mono text-sm bg-gray-50 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editedSolution} onChange={(e) => setEditedSolution(e.target.value)}
                                />
                            ) : (
                                <div className="prose prose-slate max-w-none prose-headings:font-bold">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath, remarkGfm]} 
                                        rehypePlugins={[rehypeKatex, rehypeRaw]} // Enables HTML support
                                    >
                                        {solution}
                                    </ReactMarkdown>
                                </div>
                            )}
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

              {/* ... Students & Analytics Views match previous code ... */}
              {dashboardView === 'students' && (
                 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                    {/* ... (Same as before) ... */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                       <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users size={20} className="text-blue-600"/> Class Performance</h2>
                       <button onClick={fetchStudentResults} className="text-sm text-blue-600 hover:underline">Refresh</button>
                    </div>
                    {loadingResults ? (
                      <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                          <tr>
                            <th className="p-4">Student Name</th><th className="p-4">Marks</th><th className="p-4">Verify</th><th className="p-4">Files</th><th className="p-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {studentResults.map((student) => (
                               <tr key={student.id} className="hover:bg-gray-50/50 group">
                                 <td className="p-4 font-medium text-gray-900">{student.student_name}</td>
                                 <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">{student.score}</span></td>
                                 <td className="p-4"><button onClick={() => openVerification(student)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"><Eye size={12}/> Review</button></td>
                                 <td className="p-4 flex gap-3">
                                   {student.submission_url && <a href={student.submission_url} target="_blank" className="text-gray-500 hover:text-blue-600"><FileSignature size={14}/></a>}
                                   {student.report_url && <a href={student.report_url} target="_blank" className="text-gray-500 hover:text-blue-600"><FileText size={14}/></a>}
                                 </td>
                                 <td className="p-4 text-right"><button onClick={() => handleDeleteStudent(student.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"><Trash2 size={16} /></button></td>
                               </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                 </div>
              )}

              {dashboardView === 'analytics' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px] p-6">
                      <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><ChartIcon className="text-purple-600"/> Analytics Dashboard</h2>
                      {studentResults.length > 0 ? (
                          <div className="h-[400px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={analyticsData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip />
                                      <Legend />
                                      <Bar dataKey="score" fill="#4f46e5" name="Percentage / Score" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      ) : (
                          <div className="text-center text-gray-400 py-20">Not enough data to generate charts.</div>
                      )}
                      {/* Stats (Same as before) */}
                  </div>
              )}
            </div>
          </div>
        )}

        {verifyingStudent && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-8 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden">
                    <div className="w-1/2 bg-gray-100 p-4 overflow-auto flex items-center justify-center border-r">
                        <img src={verifyingStudent.submission_url} alt="Student Submission" className="max-w-full shadow-lg" />
                    </div>
                    <div className="w-1/2 flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div><h3 className="font-bold text-lg">Verifying: {verifyingStudent.student_name}</h3><p className="text-xs text-gray-500">Manual Override Mode</p></div>
                            <button onClick={() => setVerifyingStudent(null)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
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
                            <button onClick={() => setVerifyingStudent(null)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded">Cancel</button>
                            <button onClick={saveVerification} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 shadow-sm">Save & Update Grade</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             {/* ... History Table Code ... */}
             <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider"><th className="p-4">Paper Name</th><th className="p-4">Date Solved</th><th className="p-4">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 font-medium text-gray-800">{item.name}</td>
                    <td className="p-4 text-gray-500 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => loadFromHistory(item)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1">View Solution <ChevronRight size={16} /></button>
                        {item.original_url && <a href={item.original_url} target="_blank" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm font-medium"><ExternalLink size={14} /> Original</a>}
                        <button onClick={(e) => handleDeletePaper(e, item.id)} className="text-gray-400 hover:text-red-600 text-sm font-medium flex items-center gap-1"><Trash2 size={16} /></button>
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