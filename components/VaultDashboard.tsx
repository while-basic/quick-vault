import React from 'react';
import { Capsule } from '../types';
import CapsuleCard from './CapsuleCard';
import { Plus, Hourglass, FolderOpen } from 'lucide-react';

interface VaultDashboardProps {
  capsules: Capsule[];
  onCreateNew: () => void;
  onOpenCapsule: (capsule: Capsule) => void;
  onDeleteCapsule: (id: string) => void;
}

const VaultDashboard: React.FC<VaultDashboardProps> = ({ capsules, onCreateNew, onOpenCapsule, onDeleteCapsule }) => {
  const lockedCount = capsules.filter(c => c.isLocked).length;
  const unlockedCount = capsules.filter(c => !c.isLocked).length;

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-vault-800/50 border border-vault-700 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-vault-gold/10 text-vault-gold rounded-full">
            <Hourglass size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Locked Time Capsules</p>
            <p className="text-2xl font-bold text-white">{lockedCount}</p>
          </div>
        </div>
        
        <div className="bg-vault-800/50 border border-vault-700 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-vault-accent/10 text-vault-accent rounded-full">
            <FolderOpen size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Available to Open</p>
            <p className="text-2xl font-bold text-white">{unlockedCount}</p>
          </div>
        </div>

        <button 
          onClick={onCreateNew}
          className="group relative overflow-hidden bg-gradient-to-br from-vault-accent to-indigo-600 rounded-2xl p-6 flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus size={24} className="mr-2" /> Create New Capsule
        </button>
      </div>

      {/* Grid */}
      {capsules.length === 0 ? (
        <div className="text-center py-20 bg-vault-800/30 rounded-3xl border border-dashed border-vault-700">
           <Hourglass size={48} className="mx-auto text-slate-600 mb-4" />
           <h3 className="text-xl font-bold text-slate-300">Your vault is empty</h3>
           <p className="text-slate-500 max-w-md mx-auto mt-2">Time is fleeting. Capture a moment, lock it away, and let it age like fine wine.</p>
           <button 
             onClick={onCreateNew}
             className="mt-6 text-vault-accent hover:text-white font-medium hover:underline"
            >
              Get started now
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capsules.map(capsule => (
            <CapsuleCard 
              key={capsule.id} 
              capsule={capsule} 
              onOpen={onOpenCapsule} 
              onDelete={onDeleteCapsule}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultDashboard;
