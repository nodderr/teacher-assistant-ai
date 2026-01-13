import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { BookOpen, Layers, Loader2, ChevronRight, ChevronLeft, CheckCircle2, GraduationCap, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ACADEMIC_DATA = {
    classes: ["Class 10"],
    boards: ["CBSE", "ICSE", "IB"],
    subjects: {
        "CBSE": { "Class 10": ["Science", "Mathematics"] },
        "ICSE": { "Class 10": ["Science", "Mathematics"] },
        "IB": { "Class 10": ["Science", "Mathematics"] }
    },
    chapters: {
        "CBSE": {
            "Science": {
                "Biology": ["Life Processes", "Control and Coordination", "How do Organisms Reproduce", "Heredity and Evolution", "Environment", "Resources"],
                "Chemistry": ["Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals", "Carbon and its Compounds", "Sources of Energy"],
                "Physics": ["Light – Reflection and Refraction", "The Human Eye and the Colourful World", "Electricity", "Magnetic Effects of Electric Current"]
            },
            "Mathematics": {
                "Maths": ["Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Trigonometric Identities", "Heights and Distances", "Circles", "Constructions", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"]
            }
        },
        "ICSE": {
            "Science": {
                "Physics": ["Force", "Work, Power and Energy", "Machines", "Refraction of Light", "Spectrum", "Sound", "Current Electricity", "Magnetism", "Calorimetry", "Radioactivity"],
                "Chemistry": ["Periodic Properties and Variations", "Chemical Bonding", "Study of Acids, Bases and Salts", "Analytical Chemistry", "Mole Concept and Stoichiometry", "Electrolysis", "Metallurgy", "Study of Compounds", "Hydrogen Chloride", "Sulphuric Acid", "Nitric Acid", "Ammonia", "Organic Chemistry", "Organic Compounds", "Alkanes", "Alkenes", "Alkynes", "Alcohols", "Carboxylic Acids"],
                "Biology": ["Cell – Structure and Function", "Genetics", "Evolution", "Absorption by Roots", "Transpiration", "Photosynthesis", "Circulatory System", "Excretory System", "Nervous System", "Endocrine System", "Sense Organs", "Reproductive System", "Population", "Human Evolution", "Pollution"]
            },
            "Mathematics": {
                "Commercial Mathematics": ["Commercial Mathematics"],
                "Algebra": ["Linear Inequations", "Quadratic Equations", "Factorisation", "Coordinate Geometry"],
                "Geometry": ["Similarity", "Circles", "Mensuration"],
                "Trigonometry": ["Trigonometry"],
                "Statistics & Probability": ["Statistics", "Probability"]
            }
        },
        "IB": {
            "Science": {
                "Cells & Organisms": ["Cell structure", "Cell division", "Tissues and organs"],
                "Human Body Systems": ["Nervous system", "Circulatory system", "Respiratory & Excretory systems"],
                "Genetics & Evolution": ["DNA & inheritance", "Variation", "Natural selection"],
                "Chemical Interactions": ["Atomic structure", "Periodic trends", "Chemical bonding"],
                "Reactions & Stoichiometry": ["Chemical equations", "Acids & bases", "Energy changes"],
                "Forces & Motion": ["Newton’s laws", "Work, energy & power"],
                "Electricity & Magnetism": ["Circuits", "Magnetic fields"],
                "Waves & Energy Transfer": ["Light", "Sound"],
                "Earth & Environmental Systems": ["Ecosystems", "Sustainability", "Climate change"]
            },
            "Mathematics": {
                "Number & Algebra": ["Indices", "Surds", "Quadratic equations", "Functions", "Linear functions", "Graphs", "Patterns"],
                "Geometry & Trigonometry": ["Similarity", "Pythagoras theorem", "Trigonometric ratios"],
                "Statistics & Probability": ["Data representation", "Mean, median, mode", "Probability"],
                "Mensuration": ["Surface area", "Volume"],
                "Real-Life Modelling": ["Real-Life Mathematical Modelling"]
            }
        }
    }
};

const STEPS = [
    { title: "Class & Board", icon: GraduationCap },
    { title: "Select Subject", icon: BookOpen },
    { title: "Configuration", icon: Layout },
    { title: "Finalize", icon: CheckCircle2 }
];

export default function CreatePaper({ onSuccess, setError, setIsGenerating }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const [genName, setGenName] = useState("");
  const [genClass, setGenClass] = useState("Class 10");
  const [genBoard, setGenBoard] = useState("CBSE"); 
  const [genSubject, setGenSubject] = useState("");
  const [genType, setGenType] = useState(""); 
  const [genChapters, setGenChapters] = useState([]);
  const [genDifficulty, setGenDifficulty] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      setGenSubject("");
      setGenChapters([]); 
      setGenType("");
  }, [genBoard, genClass]);

  const getCurrentChapters = () => ACADEMIC_DATA.chapters[genBoard]?.[genSubject] || {};

  const handleChapterToggle = (chapter) => {
      setGenChapters(prev => prev.includes(chapter) ? prev.filter(c => c !== chapter) : [...prev, chapter]);
  };

  const handleNext = () => {
    if (step === 0 && (!genClass || !genBoard)) return;
    if (step === 1 && !genSubject) return;
    if (step === 2 && (!genType || (genType === 'chapterwise' && genChapters.length === 0))) return;
    setDirection(1);
    setStep(s => s + 1);
  };

  const handleBack = () => {
      setDirection(-1);
      setStep(s => s - 1);
  };

  const handleGenerate = async () => {
      if(!genName) { setError("Please name your paper"); return; }
      setLoading(true); setIsGenerating(true); setError("");
      
      try {
          const response = await axios.post(`${API_URL}/generate-paper`, {
              name: genName, class_level: genClass, board: genBoard, subject: genSubject,
              paper_type: genType, chapters: genType === 'complete' ? [] : genChapters,
              difficulty: genDifficulty
          });
          onSuccess(response.data);
          // Cleanup
          setGenChapters([]); setGenType(""); setGenName(""); setStep(0);
      } catch (err) {
          setError("Failed to generate paper.");
      } finally {
          setLoading(false); setIsGenerating(false);
      }
  };

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  return (
    <div className="max-w-4xl mx-auto">
        {/* Stepper */}
        <div className="flex justify-between mb-12 relative px-10">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded" />
            <div className="absolute top-1/2 left-0 h-1 bg-primary-600 -z-10 -translate-y-1/2 rounded transition-all duration-500" 
                 style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
            
            {STEPS.map((s, i) => (
                <div key={i} className={`flex flex-col items-center gap-2 bg-white px-2 transition-colors ${i <= step ? 'text-primary-700' : 'text-gray-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${i <= step ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-md' : 'border-gray-300 bg-white'}`}>
                        <s.icon size={18} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">{s.title}</span>
                </div>
            ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 min-h-[500px] flex flex-col overflow-hidden relative">
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1 flex flex-col"
                >
                    {step === 0 && (
                        <div className="space-y-8 max-w-lg mx-auto w-full py-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Start with Academic Level</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-2">Class</label>
                                        <select className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 text-lg font-medium outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                                            value={genClass} onChange={(e) => setGenClass(e.target.value)}>
                                            {ACADEMIC_DATA.classes.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="pt-4">
                                        <label className="block text-sm font-semibold text-gray-600 mb-3">Examination Board</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {ACADEMIC_DATA.boards.map(b => (
                                                <button key={b} onClick={() => setGenBoard(b)}
                                                    className={`py-4 rounded-xl font-bold text-lg transition-all border-2 ${genBoard === b ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="py-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-8 text-center">Which subject is this for?</h3>
                            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                                {(ACADEMIC_DATA.subjects[genBoard]?.[genClass] || []).map(sub => (
                                    <button key={sub} onClick={() => { setGenSubject(sub); handleNext(); }}
                                        className={`group p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] flex flex-col gap-4 ${genSubject === sub ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-100 hover:border-primary-200 bg-white hover:shadow-lg'}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${genSubject === sub ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-600'}`}>
                                            <BookOpen size={24} />
                                        </div>
                                        <div>
                                            <span className="font-bold text-lg text-gray-800 block">{sub}</span>
                                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{genBoard}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="py-4 space-y-8">
                           <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-800">Paper Type</h4>
                                    <div className="space-y-3">
                                        {['Complete Syllabus', 'Chapterwise'].map(type => {
                                            const val = type.toLowerCase().split(' ')[0];
                                            return (
                                                <button key={type} onClick={() => setGenType(val)}
                                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${genType === val ? 'border-primary-600 bg-primary-50 text-primary-900' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${genType === val ? 'border-primary-600' : 'border-gray-300'}`}>
                                                        {genType === val && <div className="w-2.5 h-2.5 bg-primary-600 rounded-full"/>}
                                                    </div>
                                                    <span className="font-semibold">{type}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="pt-4">
                                        <label className="flex justify-between text-sm font-bold text-gray-700 mb-3">
                                            Difficulty <span className="text-primary-600">{genDifficulty}%</span>
                                        </label>
                                        <input type="range" min="0" max="100" value={genDifficulty} onChange={(e) => setGenDifficulty(e.target.value)}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col h-[400px]">
                                    <h4 className="font-bold text-gray-800 mb-4 flex justify-between items-center">
                                        <span>Select Chapters</span>
                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">{genChapters.length} selected</span>
                                    </h4>
                                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                                        {genType === 'complete' ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
                                                <Layers size={32} className="mb-2 opacity-50"/>
                                                <p className="text-sm">Whole syllabus selected.<br/>No specific chapters needed.</p>
                                            </div>
                                        ) : Object.entries(getCurrentChapters()).length === 0 ? (
                                            <p className="text-gray-400 text-sm italic">No chapters available.</p>
                                        ) : (
                                            Object.entries(getCurrentChapters()).map(([section, chapters]) => (
                                                <div key={section}>
                                                    <h5 className="font-bold text-xs uppercase text-gray-400 mb-2 sticky top-0 bg-gray-50 pb-1">{section}</h5>
                                                    <div className="space-y-1">
                                                        {chapters.map(chap => (
                                                            <label key={chap} className="flex items-start gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                                                                <input type="checkbox" className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" 
                                                                    checked={genChapters.includes(chap)} onChange={() => handleChapterToggle(chap)} disabled={genType === 'complete'} />
                                                                <span className={`text-sm leading-snug ${genChapters.includes(chap) ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>{chap}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                           </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="py-8 max-w-lg mx-auto w-full text-center">
                            <div className="mb-8 relative inline-block">
                                <div className="absolute inset-0 bg-primary-100 rounded-full blur-xl opacity-50 animate-pulse" />
                                <Layout size={64} className="text-primary-600 relative z-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate?</h3>
                            <p className="text-gray-500 mb-8">Give this paper a unique name to save it to your dashboard.</p>
                            
                            <div className="text-left bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Subject:</span> <span className="font-medium">{genSubject} ({genBoard})</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{genType}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Difficulty:</span> <span className="font-medium">{genDifficulty}%</span></div>
                            </div>

                            <input type="text" placeholder={`e.g. ${genBoard} ${genClass} Mock Test 1`} 
                                autoFocus
                                className="w-full p-4 text-center border-2 border-gray-200 rounded-xl text-lg font-medium outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all mb-6 placeholder:text-gray-300"
                                value={genName} onChange={(e) => setGenName(e.target.value)} />

                            <button onClick={handleGenerate} disabled={loading || !genName}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl shadow-primary-600/20 transition-all disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2">
                                {loading ? <Loader2 className="animate-spin" /> : "Generate Paper"}
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                <button onClick={handleBack} disabled={step === 0} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${step === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                    <ChevronLeft size={16}/> Back
                </button>
                
                {step < STEPS.length - 1 && (
                    <button onClick={handleNext} 
                        disabled={(step === 0 && (!genClass || !genBoard)) || (step === 1 && !genSubject) || (step === 2 && (!genType || (genType==='chapterwise' && genChapters.length===0)))}
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-gray-900/10 transition-all">
                        Next Step <ChevronRight size={16}/>
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}