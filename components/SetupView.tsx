import React, { useState, useEffect } from 'react';
import { TournamentConfig } from '../types';
import { AlertTriangle, CheckCircle2, UserPlus, FlaskConical, Dices } from 'lucide-react';

interface SetupViewProps {
  onStart: (config: TournamentConfig, customNames: string[]) => void;
}

const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  const [numGiocatori, setNumGiocatori] = useState(20);
  const [maniFase1, setManiFase1] = useState(8);
  const [maniFase2, setManiFase2] = useState(4);
  const [numEliminati, setNumEliminati] = useState(0);
  const [nomiGiocatori, setNomiGiocatori] = useState('');
  const [testMode, setTestMode] = useState(false);

  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

  useEffect(() => {
    const riposantiPerMano = numGiocatori % 4;
    if (riposantiPerMano === 0) {
      setManiFase1(Math.max(4, Math.floor(numGiocatori / 2)));
    } else {
      const perfetto = numGiocatori / gcd(numGiocatori, riposantiPerMano);
      setManiFase1(perfetto);
    }
  }, [numGiocatori]);

  useEffect(() => {
    const rimanenti = numGiocatori - numEliminati;
    if (rimanenti > 0) {
      setManiFase2(Math.max(3, Math.floor(rimanenti / 2)));
    }
  }, [numGiocatori, numEliminati]);

  const isSocialBalanced = (numGiocatori % 4 === 0) || ((maniFase1 * (numGiocatori % 4)) % numGiocatori === 0);
  const rimanenti = numGiocatori - numEliminati;

  const generaNomiCasuali = () => {
    const nomiEsempio = ["Marco", "Andrea", "Luca", "Matteo", "Giulia", "Sara", "Elena", "Davide", "Simone", "Chiara", "Paolo", "Francesca", "Alessandro", "Valentina", "Roberto", "Federica", "Stefano", "Giorgia", "Filippo", "Alice", "Cristian", "Martina", "Enrico", "Beatrice", "Lorenzo", "Anna", "Gabriele", "Sofia", "Riccardo", "Emma", "Tommaso", "Greta"];
    let nuoviNomi = [];
    for (let i = 0; i < numGiocatori; i++) {
      nuoviNomi.push(nomiEsempio[i] || `Giocatore ${i+1}`);
    }
    nuoviNomi.sort(() => Math.random() - 0.5);
    setNomiGiocatori(nuoviNomi.join('\n'));
  };

  const handleStart = () => {
    const names = nomiGiocatori.split('\n').map(s => s.trim()).filter(s => s);
    if (names.length > 0 && names.length !== numGiocatori) {
      alert(`Hai inserito ${names.length} nomi, ma il numero di giocatori impostato è ${numGiocatori}.`);
      return;
    }
    if (rimanenti < 4) {
      alert("Devono rimanere almeno 4 giocatori per la fase finale.");
      return;
    }
    
    onStart({
      numGiocatori,
      maniFase1,
      maniFase2,
      numEliminatiDopoFase1: numEliminati,
      testMode
    }, names);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <UserPlus className="text-emerald-500" /> Configurazione Torneo
        </h2>
        <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-700">
          <FlaskConical className={`w-5 h-5 ${testMode ? 'text-yellow-400' : 'text-slate-600'}`} />
          <span className="text-xs font-bold text-slate-400 uppercase">Test Mode</span>
          <button 
            onClick={() => setTestMode(!testMode)}
            className={`w-12 h-6 rounded-full transition-colors relative ${testMode ? 'bg-yellow-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${testMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Lista Giocatori</label>
            <button 
              onClick={generaNomiCasuali}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-400 transition"
            >
              <Dices className="w-3.5 h-3.5" /> Genera Nomi
            </button>
          </div>
          <textarea 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 h-64 focus:ring-1 focus:ring-emerald-500 outline-none transition scrollbar-thin scrollbar-thumb-slate-700"
            placeholder="Uno per riga..."
            value={nomiGiocatori}
            onChange={(e) => setNomiGiocatori(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Giocatori Totali (Max 24)</label>
              <input type="number" max="24" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black text-lg focus:border-emerald-500 outline-none" value={numGiocatori} onChange={e => setNumGiocatori(Number(e.target.value))}/>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Mani Fase Social</label>
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black text-lg focus:border-emerald-500 outline-none" value={maniFase1} onChange={e => setManiFase1(Number(e.target.value))}/>
              <div className="mt-2">
                {isSocialBalanced ? (
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-black uppercase"><CheckCircle2 className="w-3 h-3"/> Riposi Bilanciati</span>
                ) : (
                  <span className="text-[10px] text-amber-500 flex items-center gap-1 font-black uppercase"><AlertTriangle className="w-3 h-3"/> Riposi Irregolari</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Giocatori da Eliminare</label>
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black text-lg focus:border-emerald-500 outline-none" value={numEliminati} onChange={e => setNumEliminati(Number(e.target.value))}/>
              <p className="text-[10px] text-slate-500 mt-2 font-black uppercase">
                Passano il turno: <span className="text-emerald-500">{rimanenti}</span>
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Mani Fase Top (Finale)</label>
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black text-lg focus:border-emerald-500 outline-none" value={maniFase2} onChange={e => setManiFase2(Number(e.target.value))}/>
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleStart} className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-sm">
        Crea Torneo
      </button>
    </div>
  );
};

export default SetupView;