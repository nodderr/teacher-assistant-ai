import { useState } from 'react';
import axios from 'axios';
import { BookOpen, Layers, Loader2 } from 'lucide-react';

const CBSE_DATA = {
    classes: ["Class 10"],
    subjects: { "Class 10": ["Science", "Mathematics"] },
    chapters: {
        "Science": {
            "Biology": ["Life Processes", "Control and Coordination", "How do Organisms Reproduce", "Heredity and Evolution", "Environment", "Resources"],
            "Chemistry": ["Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals", "Carbon and its Compounds", "Sources of Energy"],
            "Physics": ["Light – Reflection and Refraction", "The Human Eye and the Colourful World", "Electricity", "Magnetic Effects of Electric Current"]
        },
        "Mathematics": {
            "Maths": ["Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Trigonometric Identities", "Heights and Distances", "Circles", "Constructions", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"]
        }
    }
};

export default function CreatePaper({ onSuccess, setError, setIsGenerating }) {
  const [genName, setGenName] = useState("");
  const [genClass, setGenClass] = useState("Class 10");
  const [genSubject, setGenSubject] = useState("");
  const [genType, setGenType] = useState(""); 
  const [genChapters, setGenChapters] = useState([]);
  const [genDifficulty, setGenDifficulty] = useState(50);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
      if(!genName) { setError("Please name your paper"); return; }
      if(!genSubject) { setError("Select a subject"); return; }
      if(genType === 'chapterwise' && genChapters.length === 0) { setError("Select at least one chapter"); return; }
      
      setLoading(true);
      setIsGenerating(true);
      setError("");
      
      try {
          const response = await axios.post('http://127.0.0.1:8000/generate-paper', {
              name: genName,
              class_level: genClass,
              subject: genSubject,
              paper_type: genType,
              chapters: genType === 'complete' ? [] : genChapters,
              difficulty: genDifficulty
          });
          
          // Pass result back to parent to switch view
          onSuccess(response.data);
          
          // Reset Form
          setGenChapters([]);
          setGenType("");
          setGenName("");
      } catch (err) {
          setError("Failed to generate paper.");
          console.error(err);
      } finally {
          setLoading(false);
          setIsGenerating(false);
      }
  };

  const handleChapterToggle = (chapter) => {
      setGenChapters(prev => prev.includes(chapter) ? prev.filter(c => c !== chapter) : [...prev, chapter]);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="space-y-8">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Paper Name</label>
                <input type="text" placeholder="e.g. Class 10 Pre-Board Physics" className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                    value={genName} onChange={(e) => setGenName(e.target.value)} />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1. Select Class</label>
                <select className="w-full p-3 border rounded-lg bg-gray-50 text-gray-800 font-medium" value={genClass} onChange={(e) => setGenClass(e.target.value)}>
                    {CBSE_DATA.classes.map(c => <option key={c}>{c}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2. Select Subject</label>
                <div className="grid grid-cols-2 gap-4">
                    {CBSE_DATA.subjects[genClass].map(sub => (
                        <button key={sub} onClick={() => { setGenSubject(sub); setGenChapters([]); setGenType(""); }}
                            className={`p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${genSubject === sub ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                            <BookOpen size={20} /> <span className="font-bold">{sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            {genSubject && (
                <div className="animate-in fade-in slide-in-from-top-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">3. Paper Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        {['Complete Syllabus', 'Chapterwise'].map(type => {
                            const val = type.toLowerCase().split(' ')[0];
                            return (
                                <button key={type} onClick={() => setGenType(val)}
                                    className={`p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${genType === val ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                    <Layers size={20} /> <span className="font-bold">{type}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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
                                             <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={genChapters.includes(chap)} onChange={() => handleChapterToggle(chap)} />
                                             <span className="text-sm">{chap}</span>
                                         </label>
                                     ))}
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
            )}

            {genType && (
                <div className="animate-in fade-in slide-in-from-top-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between">
                        <span>5. Difficulty Level</span><span className="text-blue-600">{genDifficulty}%</span>
                    </label>
                    <input type="range" min="0" max="100" value={genDifficulty} onChange={(e) => setGenDifficulty(e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Easy</span><span>Medium</span><span>Hard</span><span>Olympiad</span></div>
                </div>
            )}

            <button onClick={handleGenerate} disabled={loading || !genType || (genType === 'chapterwise' && genChapters.length === 0)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-8">
                {loading ? <Loader2 className="animate-spin" /> : "Generate Question Paper"}
            </button>
        </div>
    </div>
  );
}