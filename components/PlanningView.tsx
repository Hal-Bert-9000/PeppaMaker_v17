import React from 'react';
import { TournamentData, TableScore, HandAssignment } from '../types';
import { RefreshCcw } from 'lucide-react';

interface PlanningViewProps {
  data: TournamentData;
  showScores?: boolean;
  currentHandScores?: Record<number, TableScore>;
  onUpdateData?: (data: TournamentData) => void;
}

const PlanningView: React.FC<PlanningViewProps> = ({ data, showScores = false, currentHandScores = {}, onUpdateData }) => {
  const totalMani = data.config.maniFase1 + data.config.maniFase2;
  const rotationPattern = data.rotationPattern || 'DS-C';
  
  const maxTavoli = data.planningCompleto.length > 0 
    ? Math.max(...data.planningCompleto.map(m => m.tavoli.length)) 
    : Math.floor(data.config.numGiocatori / 4);

  const getSeatLabel = (tIdx: number, sIdx: number) => {
    const tableNum = tIdx + 1;
    const seatChar = String.fromCharCode(65 + (tIdx * 4) + sIdx);
    return `${tableNum}${seatChar}`;
  };

  const getRotationChar = (manoIdx: number) => {
    const chars = rotationPattern === 'DS-C' ? ['D', 'S', '-', 'C'] : ['D', 'S', 'C', '-'];
    return chars[manoIdx % 4];
  };

  const toggleRotationPattern = () => {
    if (!onUpdateData || data.status !== 'planning') return;
    const newPattern = rotationPattern === 'DS-C' ? 'DSC-' : 'DS-C';
    onUpdateData({ ...data, rotationPattern: newPattern });
  };

  const truncateName = (name: string | undefined) => {
    if (!name) return "";
    return name.length > 10 ? name.substring(0, 10) : name;
  };

  const renderPlayer = (playerId: string | undefined, manoNum: number, tableIdx: number) => {
    const cellWidth = "w-[76px]";
    if (!playerId) return <div className={`flex items-center justify-center min-h-[48px] ${cellWidth}`}><span className="text-slate-700 text-[8px] italic">...</span></div>;
    const player = data.giocatori.find(p => p.id === playerId);
    
    let scoreAtHand: number | null = null;
    let totalScoreAtHand: number | null = null;
    let isCurrent = manoNum === data.manoAttuale && data.status !== 'finished';

    if (manoNum < data.manoAttuale || data.status === 'finished') {
      const playerHistory = data.storicoPunteggi[playerId];
      if (playerHistory && playerHistory[manoNum] !== undefined) {
        scoreAtHand = playerHistory[manoNum] - playerHistory[manoNum - 1];
      }
    } else if (isCurrent) {
      const scoreInState = currentHandScores[tableIdx]?.[playerId];
      const handContribution = (scoreInState !== undefined && !isNaN(scoreInState)) ? scoreInState : 0;
      scoreAtHand = (scoreInState !== undefined && !isNaN(scoreInState)) ? scoreInState : null;
      totalScoreAtHand = (data.punteggi[playerId] || 0) + handContribution;
    }
    
    const isCappotto = scoreAtHand === 45;
    
    return (
      <div className={`flex flex-col items-center py-1 px-0.5 min-h-[48px] ${cellWidth} justify-center transition-colors border-r border-slate-800/30 last:border-r-0 ${isCappotto ? 'bg-rose-900/40' : ''}`}>
        <span className={`text-[11px] font-narrow truncate w-full text-center leading-none ${player?.isEliminated ? 'line-through text-rose-500/50' : isCappotto ? 'text-rose-100' : 'text-slate-200'}`}>
          {truncateName(player?.name)}
        </span>
        {showScores && (
          <div className="flex flex-col items-center justify-center h-5">
            {isCurrent ? (
              <span className="text-[12px] font-black text-yellow-400">
                {totalScoreAtHand}
              </span>
            ) : scoreAtHand !== null ? (
              <span className={`text-[12px] px-0.5 rounded font-mono font-black ${
                isCappotto ? 'text-rose-400' :
                scoreAtHand > 0 ? 'text-emerald-400' : 
                scoreAtHand < 0 ? 'text-rose-400' : 'text-slate-500'
              }`}>
                {scoreAtHand > 0 ? `+${scoreAtHand}` : scoreAtHand}
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const fullPlanning = Array.from({ length: totalMani }).map((_, i) => {
    const manoNum = i + 1;
    const existing = data.planningCompleto.find(m => m.mano === manoNum);
    if (existing) return existing;
    return {
      mano: manoNum,
      fase: manoNum <= data.config.maniFase1 ? 'social' : 'top',
      tavoli: [],
      riposanti: []
    } as any as HandAssignment;
  });

  const eliminatedNames = data.giocatori.filter(p => p.isEliminated).map(p => p.name).join(', ');

  return (
    <div className="flex flex-col items-center w-full mx-auto py-1">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-2 sm:p-4 shadow-2xl overflow-hidden w-full max-w-[1800px]">
        <h2 className="text-lg font-black text-white tracking-tight mb-3 uppercase text-center">Planning Torneo</h2>
        
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <table className="border-separate border-spacing-0 w-full">
            <thead>
              <tr className="bg-slate-800 text-slate-400">
                <th rowSpan={2} className="p-0 border-b border-r border-slate-600 text-center sticky left-0 bg-slate-800 z-40 font-black uppercase text-[13px] min-w-[36px] w-[36px]">N.</th>
                <th rowSpan={2} className="p-0 border-b border-r border-slate-700 text-center sticky left-[36px] bg-slate-950 z-40 min-w-[32px] w-[32px]">
                   {data.status === 'planning' ? (
                     <button 
                        onClick={toggleRotationPattern}
                        className="flex flex-col items-center justify-center w-full h-full hover:bg-slate-800 transition-colors py-1"
                     >
                       <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter leading-none mb-0.5">Pat.</span>
                       <RefreshCcw className="w-2.5 h-2.5 text-emerald-500" />
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-0.5 leading-none">{rotationPattern}</span>
                     </button>
                   ) : (
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">R</span>
                   )}
                </th>
                {Array.from({ length: maxTavoli }).map((_, i) => (
                  <th key={i} colSpan={4} className={`p-1.5 border-b border-r-2 border-slate-700 text-center text-[12px] font-black uppercase tracking-widest ${i % 2 === 0 ? 'bg-slate-900 text-emerald-400' : 'bg-slate-800/60 text-emerald-500/60'}`}>Tavolo {i + 1}</th>
                ))}
                <th rowSpan={2} className="p-1 border-b border-slate-600 text-center font-black uppercase text-[9px] min-w-[100px]">Riposo</th>
              </tr>
              <tr className="bg-slate-800/50 text-[11px] text-emerald-400">
                {Array.from({ length: maxTavoli }).map((_, tIdx) => (
                  <React.Fragment key={tIdx}>
                    <th className="p-1 border-b border-r border-slate-700 font-black w-[76px] uppercase tracking-widest">{getSeatLabel(tIdx, 0)}</th>
                    <th className="p-1 border-b border-r border-slate-700 font-black w-[76px] uppercase tracking-widest">{getSeatLabel(tIdx, 1)}</th>
                    <th className="p-1 border-b border-r border-slate-700 font-black w-[76px] uppercase tracking-widest">{getSeatLabel(tIdx, 2)}</th>
                    <th className="p-1 border-b border-r-2 border-slate-700 font-black w-[76px] uppercase tracking-widest">{getSeatLabel(tIdx, 3)}</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {fullPlanning.map((mano, idx) => {
                const isFirstTop = idx > 0 && mano.fase === 'top' && fullPlanning[idx-1].fase === 'social';
                const isGenerated = mano.tavoli.length > 0;
                const isCurrentMano = data.manoAttuale === mano.mano && data.status !== 'finished';
                
                return (
                  <React.Fragment key={idx}>
                    {isFirstTop && (
                      <tr className="bg-emerald-900/20">
                        <td colSpan={2 + maxTavoli * 4 + 1} className="p-2 text-center border-y border-emerald-500/40">
                           <div className="flex flex-col items-center">
                            <span className="text-[12px] font-black uppercase tracking-widest text-emerald-400">FASE TOP</span>
                            {eliminatedNames && <span className="text-[7px] text-rose-400/80 italic">Eliminati: {eliminatedNames}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className={`group transition-colors ${isCurrentMano ? 'bg-yellow-500/10' : 'hover:bg-slate-800/20'} ${!isGenerated ? 'opacity-40' : ''}`}>
                      <td className={`p-0 font-black text-center border-b border-r border-slate-600 sticky left-0 z-30 transition-colors text-[13px] ${isCurrentMano ? 'text-yellow-400 bg-slate-800' : 'text-slate-400 bg-slate-900 group-hover:bg-slate-800/90'}`}>
                        {mano.mano}
                      </td>
                      <td className={`p-0 border-b border-r border-slate-800 text-center sticky left-[36px] z-30 ${isCurrentMano ? 'bg-slate-800/80' : 'bg-slate-950/80'}`}>
                        <span className="text-[14px] font-black text-yellow-500 drop-shadow-sm select-none">
                          {getRotationChar(idx)}
                        </span>
                      </td>
                      {Array.from({ length: maxTavoli }).map((_, tIdx) => {
                        const tavolo = mano.tavoli[tIdx];
                        const hasTable = tIdx < mano.tavoli.length;
                        const cellBg = tIdx % 2 === 0 ? 'bg-slate-950/20' : '';
                        return (
                          <React.Fragment key={tIdx}>
                            <td className={`p-0 border-b border-slate-800/40 w-[76px] ${cellBg}`}>{hasTable ? renderPlayer(tavolo?.[0], mano.mano, tIdx) : <div className="min-h-[48px] border-r border-slate-800/20"></div>}</td>
                            <td className={`p-0 border-b border-slate-800/40 w-[76px] ${cellBg}`}>{hasTable ? renderPlayer(tavolo?.[1], mano.mano, tIdx) : <div className="min-h-[48px] border-r border-slate-800/20"></div>}</td>
                            <td className={`p-0 border-b border-slate-800/40 w-[76px] ${cellBg}`}>{hasTable ? renderPlayer(tavolo?.[2], mano.mano, tIdx) : <div className="min-h-[48px] border-r border-slate-800/20"></div>}</td>
                            <td className={`p-0 border-b border-r-2 border-slate-700 w-[76px] ${cellBg}`}>{hasTable ? renderPlayer(tavolo?.[3], mano.mano, tIdx) : <div className="min-h-[48px]"></div>}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className="p-1 border-b border-slate-800 text-[11px] font-narrow text-slate-400 text-center min-w-[100px] leading-tight group-hover:text-slate-200 transition-colors">
                        {isGenerated ? (
                          mano.riposanti.map(pid => data.giocatori.find(g => g.id === pid)?.name).filter(Boolean).map(n => n.substring(0,10)).join(', ') || '-'
                        ) : '-'}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlanningView;