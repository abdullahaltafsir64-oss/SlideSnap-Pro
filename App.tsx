
import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Share2,
  X,
  FileText,
  Presentation,
  ExternalLink,
  Copy,
  Loader2
} from 'lucide-react';
import { convertPdfToImages } from './services/pdfService';
import { convertDocxToImages } from './services/docxService';
import { convertPptxToImages } from './services/pptxService';
import { generateSocialContent } from './services/geminiService';
import { DocumentPage, ConversionStatus, AISuggestion } from './types';

const Header: React.FC = () => (
  <header className="sticky top-0 z-50 glass border-b border-slate-200 py-4">
    <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-emerald-600 p-2 rounded-xl text-white">
          <Share2 size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          SlideSnap <span className="text-emerald-600">Pro</span>
        </h1>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ultra Resolution Engine v4.0</span>
      </div>
    </div>
  </header>
);

const FileUploader: React.FC<{ onFileSelect: (file: File) => void }> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-16 text-center transition-all bg-white ${
        isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400'
      }`}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) onFileSelect(e.dataTransfer.files[0]); }}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input id="fileInput" type="file" className="hidden" accept=".pdf,.docx,.pptx" onChange={(e) => e.target.files && onFileSelect(e.target.files[0])} />
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
          <Upload size={32} />
        </div>
        <h2 className="text-3xl font-bold mb-3 text-slate-900">Upload your Presentation or Doc</h2>
        <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">
          We preserve your original layout, fonts, and charts for pixel-perfect social carousels.
        </p>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1"><FileText size={14} /> PDF</span>
          <span className="flex items-center gap-1"><Presentation size={14} /> PPTX</span>
          <span className="flex items-center gap-1"><FileText size={14} /> DOCX</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [status, setStatus] = useState<ConversionStatus>(ConversionStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [fileName, setFileName] = useState('');
  const [aiContent, setAiContent] = useState<AISuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStatusMessage = (p: number) => {
    if (p < 20) return "Initializing conversion engine...";
    if (p < 50) return "Analyzing document structure and layouts...";
    if (p < 80) return "Rendering ultra-high resolution snapshots...";
    if (p < 100) return "Finalizing image exports...";
    return "Complete!";
  };

  const handleFileSelect = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setFileName(file.name);
    setStatus(ConversionStatus.PROCESSING);
    setPages([]);
    setProgress(0);
    setError(null);

    try {
      let results: DocumentPage[] = [];
      if (ext === 'pdf') {
        results = await convertPdfToImages(file, 4, (p) => setProgress(p));
      } else if (ext === 'docx') {
        setProgress(10);
        results = await convertDocxToImages(file);
        setProgress(100);
      } else if (ext === 'pptx') {
        setProgress(5);
        results = await convertPptxToImages(file, (p) => setProgress(Math.max(5, p)));
      } else {
        throw new Error("Invalid format. Please upload PDF, DOCX, or PPTX.");
      }

      setPages(results);
      setStatus(ConversionStatus.COMPLETED);
      
      generateSocialContent(file.name, results.length).then(setAiContent).catch(console.error);
    } catch (err: any) {
      setError(err.message || "Failed to process document");
      setStatus(ConversionStatus.ERROR);
    }
  };

  const downloadAll = () => pages.forEach((p, i) => setTimeout(() => {
    const a = document.createElement('a'); a.href = p.dataUrl; a.download = `${fileName}-snap-${p.index}.png`; a.click();
  }, i * 200));

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-100">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full flex flex-col">
        {status === ConversionStatus.IDLE && (
          <div className="max-w-4xl mx-auto py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4">
               <h2 className="text-5xl font-black text-slate-900 tracking-tight">Original Fidelity <span className="text-emerald-600">Snapshots.</span></h2>
               <p className="text-xl text-slate-500">Your charts and data, in ultra-high resolution.</p>
            </div>
            <FileUploader onFileSelect={handleFileSelect} />
          </div>
        )}

        {status === ConversionStatus.PROCESSING && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in scale-in-95 duration-500">
            <div className="relative group p-8 rounded-[3rem] bg-white border border-slate-100 shadow-2xl shadow-emerald-100/50">
               <svg className="w-48 h-48 md:w-64 md:h-64 transform -rotate-90">
                  <circle
                    cx="50%" cy="50%" r="45%"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <circle
                    cx="50%" cy="50%" r="45%"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * progress) / 100}
                    strokeLinecap="round"
                    className="text-emerald-600 transition-all duration-500 ease-out"
                    style={{ strokeDasharray: '283%', strokeDashoffset: `${283 - (283 * progress / 100)}%` }}
                  />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{progress}%</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status</span>
               </div>
            </div>
            <div className="mt-12 text-center max-w-sm space-y-3">
              <h3 className="text-2xl font-bold text-slate-900">High-Res Rendering</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {getStatusMessage(progress)}
              </p>
              <div className="pt-4 flex items-center justify-center gap-2">
                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}

        {status === ConversionStatus.COMPLETED && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-700 py-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                       <CheckCircle2 />
                    </div>
                    <div className="min-w-0">
                       <h3 className="font-bold text-lg text-slate-900 truncate max-w-[200px]">{fileName}</h3>
                       <p className="text-sm text-slate-500 font-medium">{pages.length} High-Res Snaps Extracted</p>
                    </div>
                 </div>
                 <div className="flex gap-3 w-full sm:w-auto">
                    <button onClick={downloadAll} className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200">
                       <Download size={18} /> Download All
                    </button>
                    <button onClick={() => setStatus(ConversionStatus.IDLE)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-colors">
                       <X size={20} />
                    </button>
                 </div>
              </div>

              <div className="space-y-12">
                 {pages.map((page) => (
                   <div key={page.index} className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden group transition-all hover:shadow-2xl">
                      <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-b border-slate-100">
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Snap {page.index}</span>
                         <button onClick={() => { const a = document.createElement('a'); a.href = page.dataUrl; a.download = `snap-${page.index}.png`; a.click(); }} className="text-emerald-600 hover:scale-110 transition-transform flex items-center gap-2 font-bold text-sm">
                            <Download size={18} /> PNG
                         </button>
                      </div>
                      <div className="p-1 bg-slate-200">
                        <img src={page.dataUrl} alt={`Snap ${page.index}`} className="w-full h-auto block" loading="lazy" />
                      </div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="lg:col-span-4">
               <div className="sticky top-24 space-y-6">
                 <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
                   <div className="flex items-center gap-2 text-emerald-600 mb-2">
                     <Sparkles size={20} />
                     <h3 className="font-black uppercase text-xs tracking-widest">Post Strategy</h3>
                   </div>
                   
                   {!aiContent ? (
                     <div className="py-10 text-center space-y-4">
                       <Loader2 className="animate-spin text-emerald-300 mx-auto" size={32} />
                       <p className="text-sm text-slate-400">Analyzing slides for engagement...</p>
                     </div>
                   ) : (
                     <div className="space-y-6 animate-in fade-in duration-500">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carousel Hook</label>
                          <p className="mt-2 text-xl font-bold text-slate-900 leading-tight">{aiContent.headline}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Draft Caption</label>
                          <p className="mt-3 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl italic">
                            "{aiContent.caption}"
                          </p>
                        </div>
                        <div>
                           <div className="flex flex-wrap gap-2">
                              {aiContent.hashtags.map((tag, i) => (
                                <span key={i} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">{tag}</span>
                              ))}
                           </div>
                        </div>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(`${aiContent.headline}\n\n${aiContent.caption}\n\n${aiContent.hashtags.join(' ')}`); alert("Content copied to clipboard!"); }}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                        >
                          <Copy size={18} /> Copy Post Content
                        </button>
                     </div>
                   )}
                 </div>
                 <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 text-emerald-400">
                       <ExternalLink size={24} />
                    </div>
                    <h4 className="font-bold mb-2">100% Accuracy Guaranteed</h4>
                    <p className="text-slate-400 text-xs mb-6 leading-relaxed">Our engine uses pixel-accurate rendering to ensure your slides look exactly as intended.</p>
                    <div className="flex gap-2 w-full">
                       <button className="flex-1 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-xs font-bold">LinkedIn</button>
                       <button className="flex-1 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-xs font-bold">Instagram</button>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        )}

        {status === ConversionStatus.ERROR && (
           <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
             </div>
             <h3 className="text-xl font-bold mb-2">{error}</h3>
             <button onClick={() => setStatus(ConversionStatus.IDLE)} className="bg-slate-100 px-6 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-200 transition-colors">Try another file</button>
           </div>
        )}
      </main>
    </div>
  );
}
