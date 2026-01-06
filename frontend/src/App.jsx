import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import CreatePaper from './components/CreatePaper';
import GeneratedPapersList from './components/GeneratedPapersList';
import HistoryList from './components/HistoryList';
import Dashboard from './components/Dashboard';
import VerificationModal from './components/VerificationModal';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  // --- API ACTIONS ---

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/history');
      setHistoryItems(response.data || []);
    } catch (err) { console.error("History error", err); }
  };

  const fetchGeneratedPapers = async () => {
    try {
        const response = await axios.get('http://127.0.0.1:8000/generated-papers');
        setGeneratedPapers(response.data || []);
    } catch (err) { console.error("Generated papers error", err); }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'my_papers') fetchGeneratedPapers();
  }, [activeTab]);

  const handleSolve = async () => {
    if (files.length === 0 || !paperName) { setError("Please provide files and a name."); return; }
    setIsBusy(true); setError(""); setSolution(""); 
    
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    formData.append('name', paperName);

    try {
      const response = await axios.post('http://127.0.0.1:8000/solve', formData);
      setSolution(response.data.solution_text);
      setCurrentPaperId(response.data.paper_id);
      setDashboardView('solution');
    } catch (err) { setError("Failed to solve paper."); } 
    finally { setIsBusy(false); }
  };

  const handleEvaluate = async () => {
    if (!studentFile || !studentName || !currentPaperId) { setError("Missing eval info."); return; }
    setIsBusy(true);
    const formData = new FormData();
    formData.append('paper_id', currentPaperId);
    formData.append('student_file', studentFile);
    formData.append('student_name', studentName);
    formData.append('reference_solution', solution); 
    try {
      const response = await axios.post('http://127.0.0.1:8000/evaluate', formData);
      setEvalReport(response.data.evaluation_report);
      fetchStudentResults();
    } catch (err) { setError("Evaluation failed."); } 
    finally { setIsBusy(false); }
  };

  const fetchStudentResults = async () => {
    if (!currentPaperId) return;
    setLoadingResults(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/paper/${currentPaperId}/students`);
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
  };

  const loadFromHistory = async (item) => {
    setPaperName(item.name);
    setCurrentPaperId(item.id); 
    setActiveTab('dashboard');
    setDashboardView('solution');
    setIsBusy(true);
    try {
      const response = await axios.get(item.solution_url || item.original_url);
      setSolution(response.data);
      fetchStudentResults(); // Load students if any
    } catch (err) { setError("Could not load content."); } 
    finally { setIsBusy(false); }
  };

  const loadGeneratedPaper = async (item) => {
      setPaperName(item.name);
      setCurrentPaperId(null);
      setActiveTab('dashboard');
      setDashboardView('solution');
      setIsBusy(true);
      try {
          const response = await axios.get(item.file_url);
          setSolution(response.data);
      } catch (err) { setError("Could not load content."); }
      finally { setIsBusy(false); }
  };

  const saveVerification = async (id, score, report) => {
    try {
        await axios.put(`http://127.0.0.1:8000/student/${id}`, { score, report });
        setStudentResults(prev => prev.map(s => s.id === id ? {...s, score} : s));
        setVerifyingStudent(null);
    } catch (e) { alert("Failed to update."); }
  };

  const handleSaveEditedSolution = async (newText) => {
      if(currentPaperId) {
          try {
            await axios.put(`http://127.0.0.1:8000/paper/${currentPaperId}/solution`, { text: newText });
            setSolution(newText);
          } catch(e) { setError("Failed to save solution."); }
      } else {
          setSolution(newText); // Just update local if not saved to DB
      }
  };

  const deleteGeneric = async (endpoint, id, setter) => {
      if(!confirm("Are you sure?")) return;
      try {
          await axios.delete(`http://127.0.0.1:8000/${endpoint}/${id}`);
          setter(prev => prev.filter(i => i.id !== id));
      } catch(e) { alert("Delete failed"); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen relative">
        {isBusy && (
            <div className="fixed top-0 left-64 right-0 h-1 bg-blue-100 z-50">
                <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
        )}

        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'dashboard' ? 'Workspace' : activeTab === 'create' ? 'Paper Generator' : activeTab === 'my_papers' ? 'My Generated Papers' : 'Paper Archive'}
            </h2>
            <p className="text-gray-500 text-sm">Manage your question papers and evaluations</p>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded shadow-sm">
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