import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { 
  Upload, FileText, Loader2, CheckCircle2,
  Users, FileSignature, Trash2, Download,
  Edit2, Save, BarChart as ChartIcon, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function Dashboard({
    paperName, setPaperName, files, setFiles, 
    // handleSolve is now internal to Dashboard or passed as prop - we will override it here 
    // if it was passed as a prop, we assume the parent allows us to handle the logic, 
    // or we implement the logic here if "Dashboard" owns the solve trigger.
    // Based on previous code, handleSolve was passed in. We will reimplement the logic 
    // inside a local wrapper or assume we can rewrite the passed function's logic here.
    // **Assumption**: We will implement 'onSolve' locally and call setSolution provided by parent.
    // Actually, looking at props: { handleSolve, isSolving ... }
    // We need to change how handleSolve works. Since we can't change the Parent in this snippet, 
    // I will implement the logic inside this component and ignore the passed 'handleSolve' 
    // or ideally replace it. 
    // BETTER APPROACH: I will implement the streaming logic HERE.
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
  
  // New State for Progress
  const [localIsSolving, setLocalIsSolving] = useState(false);
  const [solvingProgress, setSolvingProgress] = useState({ current: 0, total: 0 });

  const startEditing = () => {
    setEditedSolution(solution);
    setIsEditingSolution(true);
  };

  const saveEdit = async () => {
      await handleSaveEditedSolution(editedSolution);
      setIsEditingSolution(false);
  };

  // --- NEW STREAMING SOLVE FUNCTION ---
  const handleStreamingSolve = async () => {
      if (!files.length || !paperName) return;
      
      setLocalIsSolving(true);
      setSolvingProgress({ current: 0, total: 0 });
      setSolution(""); // Clear previous
      
      const formData = new FormData();
      formData.append("name", paperName);
      Array.from(files).forEach(f => formData.append("files", f));

      try {
          const response = await fetch('http://127.0.0.1:8000/solve', {
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
              
              // Process all complete lines
              buffer = lines.pop(); // Keep incomplete line in buffer

              for (const line of lines) {
                  if (!line.trim()) continue;
                  try {
                      const data = JSON.parse(line);
                      
                      if (data.status === "solving_page") {
                          setSolvingProgress({ current: data.current, total: data.total });
                      } else if (data.status === "completed") {
                          setSolution(data.solution_text);
                          // We might want to notify parent of the new ID if needed, 
                          // but setSolution updates the UI.
                      }
                  } catch (e) {
                      console.error("JSON Parse Error", e);
                  }
              }
          }
      } catch (err) {
          console.error(err);
          alert("Error solving paper");
      } finally {
          setLocalIsSolving(false);
          setSolvingProgress({ current: 0, total: 0 });
      }
  };

  // --- ROBUST PRINT FUNCTION ---
  const handleDownloadPDF = () => {
    const element = document.getElementById('solution-content');
    if (!element) return;

    const printWindow = window.open('', '_blank', 'height=800,width=800,scrollbars=yes');
    
    // 1. Process Styles: Convert relative links to absolute to ensure they load in the new window
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(node => {
            if (node.tagName === 'LINK' && node.getAttribute('href')) {
                const href = node.getAttribute('href');
                if (href.startsWith('/')) {
                    // Convert relative path to absolute URL
                    return `<link rel="stylesheet" href="${window.location.origin}${href}">`;
                }
            }
            return node.outerHTML;
        })
        .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${paperName || 'Solution Key'}</title>
          ${styles} 
          <style>
            /* 2. CRITICAL PRINT RESET */
            @media print {
                /* Reset html/body to allow full scrolling/printing */
                html, body {
                    height: auto !important;
                    min-height: 100% !important;
                    overflow: visible !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                /* Define page margins */
                @page {
                    margin: 20mm;
                    size: auto;
                }

                /* Ensure the container expands fully */
                #print-root {
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: visible !important;
                    display: block !important;
                }

                /* Force Text Color to Black (Fixes fading) */
                * {
                    color: #000 !important;
                    box-shadow: none !important;
                    text-shadow: none !important;
                }

                /* Page Break Rules */
                h1, h2, h3, h4, h5, h6 { 
                    break-after: avoid; 
                    page-break-after: avoid; 
                }
                img, table, pre, blockquote { 
                    break-inside: avoid; 
                    page-break-inside: avoid; 
                }
                
                /* Fix Prose width constraints */
                .prose { 
                    max-width: none !important; 
                    width: 100% !important; 
                }
                
                /* Hide any non-printable UI elements that might sneak in */
                button, input, ::-webkit-scrollbar { 
                    display: none !important; 
                }
            }
            
            /* Screen styles for the pop-up */
            body {
                background: white;
                padding: 40px;
            }
          </style>
        </head>
        <body>
          <div id="print-root" class="prose prose-slate max-w-none">
            ${element.innerHTML}
          </div>
          <script>
            // 3. Wait for resources to load before printing
            window.onload = function() {
              setTimeout(() => {
                window.focus(); // Required for some browsers
                window.print();
                // Optional: window.close(); // Commented out so you can debug if needed
              }, 800); // Increased delay slightly to ensure fonts/math render
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
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
    <div className="grid grid-cols-12 gap-8 animate-in fade-in">
        <div className="col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">New Solution</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
                        <input type="text" className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="e.g. Physics Final 2024" value={paperName} onChange={(e) => setPaperName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Paper</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer relative">
                            <input type="file" multiple accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => setFiles(e.target.files)} />
                            <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                            <p className="text-xs text-gray-500">{files.length > 0 ? `${files.length} file(s) selected` : "Upload Images or PDF"}</p>
                        </div>
                    </div>
                    <button onClick={handleStreamingSolve} disabled={localIsSolving || files.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-medium text-sm flex justify-center items-center gap-2">
                        {localIsSolving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} /> 
                                {solvingProgress.total > 0 ? `Solving ${solvingProgress.current}/${solvingProgress.total}...` : "Preparing..."}
                            </>
                        ) : "Generate Solution"}
                    </button>
                </div>
            </div>

            {solution && (
                <>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {['solution', 'students', 'analytics'].map((view) => (
                        <button key={view} onClick={() => setDashboardView(view)}
                            className={`flex-1 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all ${dashboardView === view ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {view === 'solution' ? 'Key' : view === 'students' ? 'Results' : 'Analytics'}
                        </button>
                    ))}
                  </div>
                </div>
                {dashboardView === 'solution' && (
                    <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
                        <h3 className="text-lg font-semibold mb-3 text-indigo-900 flex items-center gap-2"><CheckCircle2 size={18}/> Student Evaluation</h3>
                        <button onClick={() => setEvalMode(!evalMode)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded font-medium text-sm transition-all">{evalMode ? "Close Evaluator" : "Grade Student Paper"}</button>
                    </div>
                )}
                </>
            )}
        </div>

        <div className="col-span-8">
            {dashboardView === 'solution' && (
            <>
                {evalMode && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-200 mb-6 animate-in slide-in-from-top-4">
                    <h4 className="font-bold text-lg text-gray-800 mb-4">Submit Student Work</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="text" placeholder="Student Name" className="p-2 border rounded text-sm" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                        
                        {/* CHANGED: ACCEPT PDF */}
                        <input type="file" accept="image/*,application/pdf" className="text-sm text-gray-500" onChange={(e) => setStudentFile(e.target.files[0])} />
                    </div>
                    <button onClick={handleEvaluate} disabled={isEvaluating} className="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {isEvaluating && <Loader2 className="animate-spin" size={14}/>} {isEvaluating ? "Grading..." : "Submit & Grade"}
                    </button>
                    {evalReport && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h5 className="font-bold text-sm text-green-700 mb-2">Current Evaluation Preview:</h5>
                            <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded border"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{evalReport}</ReactMarkdown></div>
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
                                    <button onClick={startEditing} className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"><Edit2 size={16} /> Edit Key</button>
                                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"><Download size={16} /> Print/PDF</button>
                                    </>
                                ) : (
                                    <>
                                    <button onClick={() => setIsEditingSolution(false)} className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-900 text-sm">Cancel</button>
                                    <button onClick={saveEdit} className="flex items-center gap-2 px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold shadow-sm"><Save size={16} /> Save</button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div id="solution-content">
                            {isEditingSolution ? (
                                <textarea className="w-full h-[600px] p-4 font-mono text-sm bg-gray-50 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={editedSolution} onChange={(e) => setEditedSolution(e.target.value)} />
                            ) : (
                                <div className="prose prose-slate max-w-none prose-headings:font-bold"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{solution}</ReactMarkdown></div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12"><FileText size={64} className="mb-4 opacity-20" /><p>Select a paper from history or upload a new one.</p></div>
                )}
                </div>
            </>
            )}

            {dashboardView === 'students' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users size={20} className="text-blue-600"/> Class Performance</h2>
                    <button onClick={fetchStudentResults} className="text-sm text-blue-600 hover:underline">Refresh</button>
                </div>
                {loadingResults ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500"/></div>
                ) : (
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase"><tr><th className="p-4">Student Name</th><th className="p-4">Marks</th><th className="p-4">Verify</th><th className="p-4">Files</th><th className="p-4"></th></tr></thead>
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
                                <BarChart data={analyticsData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="score" fill="#4f46e5" name="Percentage / Score" radius={[4, 4, 0, 0]} /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <div className="text-center text-gray-400 py-20">Not enough data to generate charts.</div>}
                </div>
            )}
        </div>
    </div>
  );
}