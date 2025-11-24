import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Calendar, Upload, Wand2, Loader2, Camera, FileText, Mic, Video, StopCircle, Trash2, Play, Square, X } from 'lucide-react';
import { CreateCapsuleFormData } from '../types';
import { generateCapsuleHint, refineUserNote } from '../services/gemini';

interface CreateCapsuleProps {
  onBack: () => void;
  onSubmit: (data: CreateCapsuleFormData, aiHint?: string) => Promise<void>;
}

type RecordingMode = 'none' | 'audio' | 'video';

const CreateCapsule: React.FC<CreateCapsuleProps> = ({ onBack, onSubmit }) => {
  const [formData, setFormData] = useState<CreateCapsuleFormData>({
    title: '',
    description: '',
    unlockDate: '',
    mediaFile: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Recording State
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, []);

  const cleanupMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    setMediaError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, mediaFile: e.target.files![0] }));
    }
  };

  const clearMedia = () => {
    setFormData(prev => ({ ...prev, mediaFile: null }));
    cleanupMedia();
    setRecordingMode('none');
  };

  // --- Audio Recording Logic ---
  const startAudioMode = async () => {
    setRecordingMode('audio');
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      // Auto-start recording for audio
      startRecording(audioStream, 'audio/webm');
    } catch (err) {
      console.error("Audio permission denied", err);
      setMediaError("Could not access microphone.");
    }
  };

  // --- Video Recording Logic ---
  const startVideoMode = async () => {
    setRecordingMode('video');
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(videoStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = videoStream;
      }
    } catch (err) {
      console.error("Video permission denied", err);
      setMediaError("Could not access camera/microphone.");
    }
  };

  const startRecording = (currentStream: MediaStream, mimeTypePrefix: string) => {
    chunksRef.current = [];
    try {
      const options = { mimeType: mimeTypePrefix }; // Let browser pick specific codec if needed, or use default
      // Basic check if specific mime is supported could go here, but usually browser defaults work for MediaRecorder
      const recorder = new MediaRecorder(currentStream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = chunksRef.current[0]?.type || mimeTypePrefix;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes('video') ? 'webm' : 'webm'; // Defaulting to webm for web recording
        const file = new File([blob], `recording.${ext}`, { type: mimeType });
        setFormData(prev => ({ ...prev, mediaFile: file }));
        cleanupMedia(); // Stops stream and resets UI state
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Recorder error", err);
      setMediaError("Failed to start recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Cleanup happens in onstop event
    }
  };

  const cancelRecording = () => {
    cleanupMedia();
    setRecordingMode('none');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Text Enhancement ---
  const handleEnhanceText = async () => {
    if (!formData.description) return;
    setIsEnhancing(true);
    const enhanced = await refineUserNote(formData.description);
    setFormData(prev => ({ ...prev, description: enhanced }));
    setIsEnhancing(false);
  };

  // --- Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.unlockDate) return;
    
    setIsSubmitting(true);
    try {
      // Generate AI Hint if media is present
      let aiHint = undefined;
      if (formData.mediaFile) {
         const type = formData.mediaFile.type.startsWith('image') ? 'image' 
                    : formData.mediaFile.type.startsWith('audio') ? 'audio' 
                    : 'video';
         aiHint = await generateCapsuleHint(formData.mediaFile, type);
      }
      
      await onSubmit(formData, aiHint);
    } catch (error) {
      console.error(error);
      alert("Failed to create capsule");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set min date to tomorrow
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset());
  const minDateString = minDate.toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
      </button>

      <div className="bg-vault-800 border border-vault-700 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-2">Create New Time Capsule</h2>
        <p className="text-slate-400 mb-8">Lock away a memory for your future self.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Capsule Title</label>
            <input 
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full bg-vault-900 border border-vault-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-vault-accent transition-colors"
              placeholder="e.g., Message to 2030 Me"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-vault-gold" /> Unlock Date & Time
            </label>
            <input 
              type="datetime-local"
              required
              min={minDateString}
              value={formData.unlockDate}
              onChange={e => setFormData({...formData, unlockDate: e.target.value})}
              className="w-full bg-vault-900 border border-vault-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-vault-gold transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Media Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Secure Content</label>
            
            {/* 1. Media Present State */}
            {formData.mediaFile ? (
              <div className="bg-vault-900 border border-vault-700 rounded-xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 rounded-lg bg-vault-800 flex items-center justify-center flex-shrink-0 text-vault-accent">
                    {formData.mediaFile.type.startsWith('image') && <Camera size={24} />}
                    {formData.mediaFile.type.startsWith('video') && <Video size={24} />}
                    {formData.mediaFile.type.startsWith('audio') && <Mic size={24} />}
                  </div>
                  <div className="min-w-0">
                     <p className="text-white font-medium truncate">{formData.mediaFile.name}</p>
                     <p className="text-xs text-slate-500">{(formData.mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={clearMedia}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ) : recordingMode !== 'none' ? (
              /* 2. Recording State */
              <div className="bg-vault-900 border border-vault-accent rounded-xl p-4 relative overflow-hidden">
                {mediaError ? (
                  <div className="text-red-400 text-center py-4 flex flex-col items-center gap-2">
                     <span className="font-bold">Error</span>
                     <span>{mediaError}</span>
                     <button type="button" onClick={cancelRecording} className="mt-2 text-xs bg-vault-800 px-3 py-1 rounded">Cancel</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 space-y-4">
                     
                     {/* Video Preview Area */}
                     {recordingMode === 'video' && (
                       <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden border border-vault-700 mb-2">
                         <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                         {isRecording && <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                       </div>
                     )}

                     {/* Audio Visualizer Placeholder */}
                     {recordingMode === 'audio' && (
                        <div className="w-24 h-24 rounded-full bg-vault-800 flex items-center justify-center animate-pulse border-2 border-vault-accent text-vault-accent">
                           <Mic size={32} />
                        </div>
                     )}
                     
                     {/* Timer */}
                     <div className="font-mono text-2xl font-bold text-white">
                        {isRecording ? formatTime(recordingTime) : 'Ready'}
                     </div>

                     {/* Controls */}
                     <div className="flex items-center gap-6">
                        <button 
                          type="button" 
                          onClick={cancelRecording}
                          className="p-3 rounded-full text-slate-400 hover:bg-vault-800 transition-colors"
                        >
                          <X size={24} />
                        </button>
                        
                        {!isRecording && recordingMode === 'video' ? (
                           <button 
                             type="button"
                             onClick={() => stream && startRecording(stream, 'video/webm')}
                             className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/50 transition-transform active:scale-95"
                           >
                              <div className="w-6 h-6 bg-white rounded-full" />
                           </button>
                        ) : (
                           <button 
                             type="button"
                             onClick={stopRecording}
                             className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center hover:bg-red-500/10 transition-colors"
                           >
                              <Square size={24} className="fill-red-500 text-red-500" />
                           </button>
                        )}
                     </div>
                  </div>
                )}
              </div>
            ) : (
              /* 3. Empty Selection State */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Upload */}
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="border-2 border-dashed border-vault-700 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-vault-accent hover:bg-vault-900/50 transition-all group"
                 >
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileChange} />
                   <div className="p-3 bg-vault-800 rounded-full text-slate-400 group-hover:text-white transition-colors">
                     <Upload size={24} />
                   </div>
                   <span className="text-sm text-slate-400 font-medium">Upload File</span>
                 </div>

                 {/* Record Audio */}
                 <button
                   type="button" 
                   onClick={startAudioMode}
                   className="border border-vault-700 bg-vault-800/50 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-vault-accent hover:bg-vault-900 transition-all group"
                 >
                   <div className="p-3 bg-vault-800 rounded-full text-slate-400 group-hover:text-vault-accent transition-colors">
                     <Mic size={24} />
                   </div>
                   <span className="text-sm text-slate-400 font-medium">Record Audio</span>
                 </button>

                 {/* Record Video */}
                 <button 
                   type="button"
                   onClick={startVideoMode}
                   className="border border-vault-700 bg-vault-800/50 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-vault-accent hover:bg-vault-900 transition-all group"
                 >
                   <div className="p-3 bg-vault-800 rounded-full text-slate-400 group-hover:text-vault-accent transition-colors">
                     <Video size={24} />
                   </div>
                   <span className="text-sm text-slate-400 font-medium">Record Video</span>
                 </button>
              </div>
            )}
          </div>

          {/* Note Area with AI */}
          <div>
            <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-medium text-slate-300">Note to Future Self</label>
               <button 
                 type="button"
                 onClick={handleEnhanceText}
                 disabled={isEnhancing || !formData.description}
                 className="flex items-center gap-1 text-xs text-vault-accent hover:text-white disabled:opacity-50 transition-colors"
               >
                 {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                 {isEnhancing ? 'Enhancing...' : 'Enhance with Gemini'}
               </button>
            </div>
            <textarea 
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-vault-900 border border-vault-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-vault-accent transition-colors"
              placeholder="Write something memorable..."
            />
          </div>

          {/* Submit */}
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-vault-accent to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" /> Sealing Vault...
              </>
            ) : (
              <>
                Seal Capsule <span className="text-blue-200">|</span> Lock Forever
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateCapsule;