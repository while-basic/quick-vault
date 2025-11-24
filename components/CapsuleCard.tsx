import React, { useEffect, useState } from 'react';
import { Capsule } from '../types';
import { Lock, Unlock, Clock, Eye, Trash2 } from 'lucide-react';

interface CapsuleCardProps {
  capsule: Capsule;
  onOpen: (capsule: Capsule) => void;
  onDelete: (id: string) => void;
}

const CapsuleCard: React.FC<CapsuleCardProps> = ({ capsule, onOpen, onDelete }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isLocked, setIsLocked] = useState(capsule.isLocked);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const unlockTime = new Date(capsule.unlockDate).getTime();
      const distance = unlockTime - now;

      if (distance < 0) {
        setIsLocked(false);
        setTimeLeft('UNLOCKED');
        return;
      }

      setIsLocked(true);
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [capsule.unlockDate]);

  return (
    <div className={`relative group overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl 
      ${isLocked 
        ? 'border-vault-700 bg-vault-800/50 hover:border-vault-gold/30' 
        : 'border-vault-accent/50 bg-vault-800/80 hover:border-vault-accent'
      }`}>
      
      {/* Background Decor */}
      <div className={`absolute inset-0 opacity-10 pointer-events-none ${isLocked ? 'bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]' : ''}`} />

      <div className="p-6 relative z-10 flex flex-col h-full min-h-[280px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-full ${isLocked ? 'bg-vault-gold/10 text-vault-gold' : 'bg-vault-accent/10 text-vault-accent'}`}>
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
          </div>
          <div className="text-xs text-slate-400 font-mono">
             {new Date(capsule.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col justify-center items-center text-center space-y-3">
          <h3 className="text-xl font-bold text-slate-100 tracking-tight line-clamp-1">{capsule.title}</h3>
          
          {isLocked ? (
            <div className="space-y-4 w-full">
              <div className="text-sm text-slate-400 italic font-serif px-4">
                "{capsule.aiHint || 'A secret preserved in time...'}"
              </div>
              <div className="font-mono text-lg text-vault-gold font-bold bg-black/20 py-2 rounded-lg border border-vault-gold/10">
                {timeLeft}
              </div>
            </div>
          ) : (
             <div className="space-y-4">
               <p className="text-slate-300 line-clamp-3 text-sm">{capsule.description}</p>
               {capsule.aiReflection && (
                 <div className="text-xs text-vault-accent italic bg-vault-accent/5 p-2 rounded border border-vault-accent/10">
                   AI Reflection: "{capsule.aiReflection}"
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-between items-center border-t border-slate-700/50 pt-4">
            <button 
              onClick={() => onDelete(capsule.id)}
              className="text-slate-500 hover:text-red-400 transition-colors p-2"
              title="Delete Capsule"
            >
              <Trash2 size={18} />
            </button>
            
            {!isLocked && (
              <button 
                onClick={() => onOpen(capsule)}
                className="flex items-center gap-2 bg-vault-accent hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-sky-900/20 active:scale-95"
              >
                <Eye size={16} /> Open Vault
              </button>
            )}
            
            {isLocked && (
               <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Clock size={14} />
                  <span>Locked</span>
               </div>
            )}
        </div>
      </div>
      
      {/* Locked Overlay Effect */}
      {isLocked && (
        <div className="absolute inset-0 bg-gradient-to-t from-vault-900/80 via-transparent to-transparent pointer-events-none" />
      )}
    </div>
  );
};

export default CapsuleCard;
