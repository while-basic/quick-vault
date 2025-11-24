import React, { useState, useEffect } from 'react';
import { Capsule, CreateCapsuleFormData, ViewState } from './types';
import * as db from './services/storage';
import VaultDashboard from './components/VaultDashboard';
import CreateCapsule from './components/CreateCapsule';
import { generateFutureReflection } from './services/gemini';
import { LayoutGrid, X, Mic } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);

  // Load initial data
  useEffect(() => {
    loadCapsules();
  }, []);

  const loadCapsules = async () => {
    try {
      const data = await db.getAllCapsules();
      // Sort: Unlocked first, then by unlock date ascending (closest to unlock)
      const sorted = data.sort((a, b) => {
         if (a.isLocked === b.isLocked) {
            return new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime();
         }
         return a.isLocked ? 1 : -1;
      });
      setCapsules(sorted);
    } catch (e) {
      console.error("Failed to load capsules", e);
    }
  };

  const handleCreateSubmit = async (data: CreateCapsuleFormData, aiHint?: string) => {
    // Generate an AI reflection if text is present
    let reflection = undefined;
    if (data.description) {
        reflection = await generateFutureReflection(data.description);
    }

    let mediaType: 'text' | 'image' | 'video' | 'audio' = 'text';
    if (data.mediaFile) {
      if (data.mediaFile.type.startsWith('image')) mediaType = 'image';
      else if (data.mediaFile.type.startsWith('audio')) mediaType = 'audio';
      else mediaType = 'video';
    }

    const newCapsule: Capsule = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      mediaType: mediaType,
      mediaBlob: data.mediaFile || undefined,
      unlockDate: data.unlockDate,
      createdAt: new Date().toISOString(),
      isLocked: true, // Initially true
      aiHint: aiHint,
      aiReflection: reflection
    };

    await db.saveCapsule(newCapsule);
    await loadCapsules();
    setView('DASHBOARD');
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this memory forever?")) {
      await db.deleteCapsule(id);
      await loadCapsules();
    }
  };

  const handleOpenCapsule = (capsule: Capsule) => {
    setSelectedCapsule(capsule);
    setView('VIEW_CAPSULE');
  };

  // Render View Capsule Modal/Page
  const renderViewer = () => {
    if (!selectedCapsule) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <div className="bg-vault-800 border border-vault-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative flex flex-col">
          
          <button 
            onClick={() => setView('DASHBOARD')}
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 h-full min-h-[500px]">
            {/* Media Side */}
            <div className="bg-black flex items-center justify-center h-full min-h-[300px] md:min-h-auto border-b md:border-b-0 md:border-r border-vault-700 relative">
              
              {/* Image */}
              {selectedCapsule.mediaType === 'image' && selectedCapsule.mediaUrl && (
                <img src={selectedCapsule.mediaUrl} alt="Vault Content" className="max-w-full max-h-[60vh] object-contain" />
              )}
              
              {/* Video */}
              {selectedCapsule.mediaType === 'video' && selectedCapsule.mediaUrl && (
                <video controls className="max-w-full max-h-[60vh]">
                  <source src={selectedCapsule.mediaUrl} type={selectedCapsule.mediaBlob?.type} />
                  Your browser does not support the video tag.
                </video>
              )}
              
              {/* Audio */}
              {selectedCapsule.mediaType === 'audio' && selectedCapsule.mediaUrl && (
                <div className="flex flex-col items-center justify-center p-10 w-full">
                  <div className="w-24 h-24 rounded-full bg-vault-800 flex items-center justify-center mb-6 animate-pulse-slow border border-vault-700 shadow-[0_0_30px_rgba(14,165,233,0.15)]">
                    <Mic size={48} className="text-vault-accent" />
                  </div>
                   <audio controls className="w-full max-w-xs [&::-webkit-media-controls-panel]:bg-slate-200">
                    <source src={selectedCapsule.mediaUrl} type={selectedCapsule.mediaBlob?.type} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Text Only */}
              {selectedCapsule.mediaType === 'text' && (
                <div className="text-slate-500 italic p-10 flex flex-col items-center gap-2">
                   <div className="w-16 h-16 rounded-full bg-vault-800 flex items-center justify-center">
                     <LayoutGrid size={24} />
                   </div>
                   <span>Text Only Memory</span>
                </div>
              )}
            </div>

            {/* Info Side */}
            <div className="p-8 flex flex-col space-y-6 overflow-y-auto">
              <div>
                <span className="text-vault-accent text-xs font-bold uppercase tracking-wider mb-2 block">Unlocked Memory</span>
                <h2 className="text-3xl font-bold text-white mb-2">{selectedCapsule.title}</h2>
                <p className="text-slate-500 text-sm">
                  Created on {new Date(selectedCapsule.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-vault-900/50 p-6 rounded-xl border border-vault-700">
                 <h4 className="text-sm text-slate-400 mb-2 uppercase tracking-wide font-semibold">Your Note</h4>
                 <p className="text-slate-200 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                    {selectedCapsule.description}
                 </p>
              </div>

              {selectedCapsule.aiReflection && (
                <div className="bg-gradient-to-br from-vault-accent/10 to-indigo-900/20 p-6 rounded-xl border border-vault-accent/20">
                   <h4 className="text-sm text-vault-accent mb-2 uppercase tracking-wide font-semibold flex items-center gap-2">
                      Gemini Insight
                   </h4>
                   <p className="text-sky-200 italic leading-relaxed">
                      "{selectedCapsule.aiReflection}"
                   </p>
                </div>
              )}
              
              <div className="mt-auto pt-8 text-center">
                 <p className="text-slate-600 text-xs">
                    This capsule was sealed for {Math.ceil((new Date(selectedCapsule.unlockDate).getTime() - new Date(selectedCapsule.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans text-slate-100 selection:bg-vault-accent selection:text-white">
      {/* Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-vault-900 to-black z-[-1]" />
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-vault-900/80 backdrop-blur-md border-b border-vault-700">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <div className="w-8 h-8 bg-gradient-to-br from-vault-gold to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/20">
               <LayoutGrid size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Chronos<span className="text-vault-gold">Vault</span></h1>
          </div>
          
          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            SECURE TIME STORAGE PROTOCOL v1.0
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'DASHBOARD' && (
          <VaultDashboard 
            capsules={capsules}
            onCreateNew={() => setView('CREATE')}
            onOpenCapsule={handleOpenCapsule}
            onDeleteCapsule={handleDelete}
          />
        )}

        {view === 'CREATE' && (
          <CreateCapsule 
            onBack={() => setView('DASHBOARD')}
            onSubmit={handleCreateSubmit}
          />
        )}

        {view === 'VIEW_CAPSULE' && renderViewer()}
      </main>
    </div>
  );
};

export default App;