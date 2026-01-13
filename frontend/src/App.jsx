import { useState, useEffect } from 'react';
import { API_URL } from './config';
import axios from 'axios';
import { AlertCircle, Menu, X } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Components
import Sidebar from './components/Sidebar';
import CreatePaper from './components/CreatePaper';
import GeneratedPapersList from './components/GeneratedPapersList';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import VerificationModal from './components/VerificationModal';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  
  // -- GLOBAL DATA STATE --
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0); 
  const [isBusy, setIsBusy] = useState(false); // Generic busy flag

  // -- DASHBOARD STATE (Hoisted) --
  const [currentPaperId, setCurrentPaperId] = useState(null); 
  const [paperName, setPaperName] = useState("");
  const [solution, setSolution] = useState("");
  const [files, setFiles] = useState([]);
  const [dashboardView, setDashboardView] = useState('solution'); 
  
  // -- EVALUATION STATE --
  const [studentResults, setStudentResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentFile, setStudentFile] = useState(null);
  const [evalReport, setEvalReport] = useState("");
  
  // -- HISTORY & PAPERS LISTS --
  const [historyItems, setHistoryItems] = useState([]);
  const [generatedPapers, setGeneratedPapers] = useState([]);
  
  // -- MODAL --
  const [verifyingStudent, setVerifyingStudent] = useState(null);

  // --- PROGRESS BAR EFFECT ---
  useEffect(() => {
    let interval;
    if (isBusy) {
      setProgress(10);
      interval = setInterval(() => setProgress((prev) => (prev < 90 ? prev + Math.random() * 10 : prev)), 800);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [isBusy]);

  // --- RESPONSIVE SIDEBAR EFFECT ---
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth >= 1024) {
              setIsSidebarOpen(true);
          } else {
              setIsSidebarOpen(false);
          }
      };
      
      // Initial check
      handleResize();

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- API ACTIONS ---

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/history`);
      setHistoryItems(response.data || []);
    } catch (err) { console.error("History error", err); }
  };

  const fetchGeneratedPapers = async () => {
    try {
        const response = await axios.get(`${API_URL}/generated-papers`);
        setGeneratedPapers(response.data || []);
    } catch (err) { console.error("Generated papers error", err); }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'my_papers') fetchGeneratedPapers();
  }, [activeTab]);

  // handleSolve is kept for simple file uploads if needed, but Dashboard has its own streaming solver now.
  const handleSolve = async () => {
    if (files.length === 0 || !paperName) { toast.error("Please provide files and a name."); return; }
    setIsBusy(true); setError(""); setSolution(""); 
    
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    formData.append('name', paperName);

    try {
      const response = await axios.post(`${API_URL}/solve`, formData);
      setSolution(response.data.solution_text);
      setCurrentPaperId(response.data.paper_id);
      setDashboardView('solution');
      toast.success("Solution generated!");
    } catch (err) { 
        console.error(err);
        toast.error("Failed to solve paper."); 
    } 
    finally { setIsBusy(false); }
  };

  const handleEvaluate = async () => {
    if (!studentFile || !studentName || !currentPaperId) { toast.error("Missing student info or paper ID."); return; }
    setIsBusy(true);
    const formData = new FormData();
    formData.append('paper_id', currentPaperId);
    formData.append('student_file', studentFile);
    formData.append('student_name', studentName);
    formData.append('reference_solution', solution); 
    try {
      const response = await axios.post(`${API_URL}/evaluate`, formData);
      setEvalReport(response.data.evaluation_report);
      fetchStudentResults();
      toast.success("Evaluation complete!");
    } catch (err) { 
        console.error(err);
        toast.error("Evaluation failed."); 
    } 
    finally { setIsBusy(false); }
  };

  const fetchStudentResults = async () => {
    if (!currentPaperId) return;
    setLoadingResults(true);
    try {
      const response = await axios.get(`${API_URL}/paper/${currentPaperId}/students`);
      setStudentResults(response.data || []);
    } catch (err) { console.error(err); } 
    finally { setLoadingResults(false); }
  };

  // --- UI HANDLERS ---
  const handlePaperGenerated = (data) => {
      setSolution(data.text);
      setCurrentPaperId(null);
      setPaperName(data.name || "Generated Paper");
      setActiveTab('dashboard');
      setDashboardView('solution');
      toast.success(`Paper "${data.name}" generated!`);
      if (window.innerWidth < 1024) setIsSidebarOpen(false); // Close sidebar on mobile action
  };

  const loadFromHistory = async (item) => {
    setPaperName(item.name);
    setCurrentPaperId(item.id); 
    setActiveTab('dashboard');
    setDashboardView('solution');
    setIsBusy(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    try {
      const response = await axios.get(item.solution_url || item.original_url);
      setSolution(response.data);
      fetchStudentResults(); // Load students if any
    } catch (err) { toast.error("Could not load content."); } 
    finally { setIsBusy(false); }
  };

  const loadGeneratedPaper = async (item) => {
      setPaperName(item.name);
      setCurrentPaperId(null);
      setActiveTab('dashboard');
      setDashboardView('solution');
      setIsBusy(true);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      try {
          const response = await axios.get(item.file_url);
          setSolution(response.data);
      } catch (err) { toast.error("Could not load content."); }
      finally { setIsBusy(false); }
  };

  const saveVerification = async (id, score, report) => {
    try {
        await axios.put(`${API_URL}/student/${id}`, { score, report });
        setStudentResults(prev => prev.map(s => s.id === id ? {...s, score} : s));
        setVerifyingStudent(null);
        toast.success("Verification saved.");
    } catch (e) { toast.error("Failed to update verification."); }
  };

  const handleSaveEditedSolution = async (newText) => {
      if(currentPaperId) {
          try {
            await axios.put(`${API_URL}/paper/${currentPaperId}/solution`, { text: newText });
            setSolution(newText);
            toast.success("Solution saved.");
          } catch(e) { toast.error("Failed to save solution."); }
      } else {
          setSolution(newText); // Just update local if not saved to DB
      }
  };

  const deleteGeneric = async (endpoint, id, setter) => {
      if(!confirm("Are you sure?")) return;
      try {
          await axios.delete(`${API_URL}/${endpoint}/${id}`);
          setter(prev => prev.filter(i => i.id !== id));
          toast.success("Item deleted.");
      } catch(e) { toast.error("Delete failed."); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster richColors position="top-center" />
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth < 1024 && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
            setActiveTab(tab);
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className={`flex-1 p-4 lg:p-8 overflow-y-auto h-screen relative transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
        {isBusy && (
            <div className="fixed top-0 left-0 right-0 h-1 bg-primary-100 z-50">
                <div className="h-full bg-primary-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
        )}

        <header className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200">
          <button 
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
              <Menu size={24} />
          </button>
          
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' ? 'Workspace' : activeTab === 'create' ? 'Paper Generator' : activeTab === 'my_papers' ? 'My Generated Papers' : 'Paper Archive'}
            </h2>
            <p className="text-gray-500 text-xs lg:text-sm">Manage your question papers and evaluations</p>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {activeTab === 'create' && (
            <CreatePaper onSuccess={handlePaperGenerated} setError={setError} setIsGenerating={setIsBusy} />
        )}

        {activeTab === 'my_papers' && (
            <GeneratedPapersList papers={generatedPapers} onLoad={loadGeneratedPaper} onDelete={(e, id) => deleteGeneric('generated-papers', id, setGeneratedPapers)} />
        )}

        {activeTab === 'history' && (
            <HistoryList items={historyItems} onLoad={loadFromHistory} onDelete={(e, id) => deleteGeneric('history', id, setHistoryItems)} />
        )}

        {activeTab === 'dashboard' && (
            <Dashboard 
                paperName={paperName} setPaperName={setPaperName}
                files={files} setFiles={setFiles}
                handleSolve={handleSolve} isSolving={isBusy}
                solution={solution} setSolution={setSolution}
                currentPaperId={currentPaperId}
                dashboardView={dashboardView} setDashboardView={setDashboardView}
                studentResults={studentResults} loadingResults={loadingResults} fetchStudentResults={fetchStudentResults}
                handleEvaluate={handleEvaluate} isEvaluating={isBusy} evalReport={evalReport}
                studentName={studentName} setStudentName={setStudentName} setStudentFile={setStudentFile}
                handleDeleteStudent={(id) => deleteGeneric('student', id, setStudentResults)}
                openVerification={setVerifyingStudent}
                handleSaveEditedSolution={handleSaveEditedSolution}
            />
        )}

        {verifyingStudent && (
            <VerificationModal student={verifyingStudent} onClose={() => setVerifyingStudent(null)} onSave={saveVerification} />
        )}
      </main>
    </div>
  );
}

export default App;