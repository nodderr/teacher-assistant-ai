import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [solution, setSolution] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSolution("");
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Sending request to Python Backend
      const response = await axios.post('http://127.0.0.1:8000/solve', formData);
      setSolution(response.data.solution_text);
    } catch (err) {
      console.error(err);
      setError("Failed to get solution. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto py-12 px-4">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-blue-700 mb-2 tracking-tight">
            AI Teacher Assistant
          </h1>
          <p className="text-slate-500 text-lg">
            Upload a question paper and get step-by-step math solutions instantly.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mb-10 text-center transition-all hover:shadow-2xl">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-xl p-8 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-12 h-12 text-blue-500 mb-3" />
            <p className="text-lg font-medium text-slate-700">
              {file ? file.name : "Click or Drag to Upload Question Paper"}
            </p>
            <p className="text-sm text-slate-400 mt-1">Supports PNG, JPG</p>
          </div>

          <button 
            onClick={handleUpload}
            disabled={!file || loading}
            className={`mt-6 w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.99]
              ${!file || loading 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}
          >
            {loading ? <><Loader2 className="animate-spin" /> Analyzing...</> : "Solve Paper"}
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm justify-center">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        {/* Solution Section */}
        {solution && (
          <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100 animate-fade-in-up">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="bg-green-100 p-2 rounded-lg text-green-700">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Generated Solution</h2>
            </div>
            
            <div className="prose prose-lg max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-code:text-blue-600 prose-pre:bg-slate-900">
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {solution}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;