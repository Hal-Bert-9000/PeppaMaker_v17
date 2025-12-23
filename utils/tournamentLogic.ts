import { HandAssignment, Player, TournamentConfig } from '../types';

export const shuffle = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const getRelativePos = (i: number, j: number): number => (j - i + 4) % 4;
const getRelKey = (id1: string, id2: string) => `${id1}:${id2}`;

export function optimizeTableSeating(
  table: string[], 
  relazioni: Record<string, number[]>, 
  nextManoIdx: number,
  config: TournamentConfig,
  isTopTable: boolean = false
): string[] {
  const totalMani = config.maniFase1 + config.maniFase2;
  const isFirstTopHand = nextManoIdx === config.maniFase1 + 1;
  const isLastThree = nextManoIdx > (totalMani - 3);
  
  // Logica Posizioni Fisse per il Tavolo 1 nella Fase Top
  if (isTopTable && nextManoIdx > config.maniFase1) {
    if (isFirstTopHand && !isLastThree) {
      return [table[0], table[3], table[1], table[2]]; // A D B C
    }
    if (isLastThree) {
      const relativeFinalHand = totalMani - nextManoIdx; 
      if (relativeFinalHand === 2) return [table[0], table[2], table[3], table[1]]; // A C D B
      if (relativeFinalHand === 1) return [table[0], table[1], table[2], table[3]]; // A B C D
      if (relativeFinalHand === 0) return [table[0], table[3], table[1], table[2]]; // A D B C
    }
  }

  // Permutazioni per ottimizzazione social (evita stesse posizioni relative)
  const permutations = [
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1],
    [1, 0, 2, 3], [2, 1, 0, 3], [3, 1, 2, 0]
  ];

  let bestPerm = permutations[0];
  let minConflicts = Infinity;

  for (const permIdx of permutations) {
    const testTable = permIdx.map(i => table[i]);
    let conflicts = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (i === j) continue;
        const p1 = testTable[i];
        const p2 = testTable[j];
        const pos = getRelativePos(i, j);
        const history = relazioni[getRelKey(p1, p2)] || [];
        if (history.includes(pos)) conflicts += 10000;
        conflicts += history.length * 100;
      }
    }
    if (conflicts < minConflicts) {
      minConflicts = conflicts;
      bestPerm = permIdx;
    }
  }
  return bestPerm.map(i => table[i]);
}

export function updateRelazioni(table: string[], relazioni: Record<string, number[]>) {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (i === j) continue;
      const key = getRelKey(table[i], table[j]);
      if (!relazioni[key]) relazioni[key] = [];
      relazioni[key].push(getRelativePos(i, j));
    }
  }
}

export function generatePlanning(config: TournamentConfig, players: Player[]): { planning: HandAssignment[], relazioni: Record<string, number[]> } {
  const planning: HandAssignment[] = [];
  const relazioni: Record<string, number[]> = {};
  const playerIds = players.map(p => p.id);
  const restCounts: Record<string, number> = Object.fromEntries(playerIds.map(id => [id, 0]));
  const encounterCounts: Record<string, number> = {};
  const getPairKey = (id1: string, id2: string) => id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;

  for (let m = 1; m <= config.maniFase1; m++) {
    const numTavoli = Math.floor(playerIds.length / 4);
    const availableToPlay = [...playerIds];
    const currentManoTavoli: string[][] = [];
    const inGameIds: string[] = [];

    for (let t = 0; t < numTavoli; t++) {
      let table: string[] = [];
      // Priorità a chi ha riposato di più
      availableToPlay.sort((a, b) => (restCounts[b] || 0) - (restCounts[a] || 0));
      table.push(availableToPlay.shift()!);

      // Selezione compagni basata su minimi incontri precedenti
      for (let slot = 1; slot < 4; slot++) {
        availableToPlay.sort((a, b) => {
          const diffRest = (restCounts[b] || 0) - (restCounts[a] || 0);
          if (diffRest !== 0) return diffRest;
          let scoreA = 0; let scoreB = 0;
          table.forEach(pInTable => {
            scoreA += (encounterCounts[getPairKey(pInTable, a)] || 0);
            scoreB += (encounterCounts[getPairKey(pInTable, b)] || 0);
          });
          return scoreA - scoreB;
        });
        table.push(availableToPlay.shift()!);
      }

      const optimizedTable = optimizeTableSeating(table, relazioni, m, config);
      updateRelazioni(optimizedTable, relazioni);
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          const pk = getPairKey(optimizedTable[i], optimizedTable[j]);
          encounterCounts[pk] = (encounterCounts[pk] || 0) + 1;
        }
      }
      currentManoTavoli.push(optimizedTable);
      inGameIds.push(...optimizedTable);
    }

    const riposanti = playerIds.filter(id => !inGameIds.includes(id));
    riposanti.forEach(id => restCounts[id]++);
    planning.push({ mano: m, tavoli: currentManoTavoli, riposanti, fase: 'social' });
  }
  return { planning, relazioni };
}

export function generateNextTopHand(data: {
  config: TournamentConfig,
  giocatori: Player[],
  punteggi: Record<string, number>,
  storicoRelazioni: Record<string, number[]>,
  planningCompleto: HandAssignment[]
}, nextManoIdx: number): HandAssignment {
  const activePlayers = data.giocatori.filter(p => p.isEliminated !== true);
  const numTavoli = Math.floor(activePlayers.length / 4);
  const sortedPlayers = [...activePlayers].sort((a, b) => (data.punteggi[b.id] || 0) - (data.punteggi[a.id] || 0));

  const totalMani = data.config.maniFase1 + data.config.maniFase2;
  const isFirstTopHand = nextManoIdx === data.config.maniFase1 + 1;
  const isLastThree = nextManoIdx > (totalMani - 3);
  const isSpecialTopHand = isFirstTopHand || isLastThree;

  const encounterCounts: Record<string, number> = {};
  const getPairKey = (id1: string, id2: string) => id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
  
  data.planningCompleto.forEach(m => {
    m.tavoli.forEach(t => {
      for(let i=0; i<4; i++) {
        for(let j=i+1; j<4; j++) {
          const pk = getPairKey(t[i], t[j]);
          encounterCounts[pk] = (encounterCounts[pk] || 0) + 1;
        }
      }
    });
  });

  const currentManoTavoli: string[][] = [];
  const availableToPlay = sortedPlayers.map(p => p.id);
  const inGameIds: string[] = [];

  // Se speciale, Tavolo 1 basato su ranking
  if (isSpecialTopHand) {
    const top4 = availableToPlay.splice(0, 4);
    const table1 = optimizeTableSeating(top4, data.storicoRelazioni, nextManoIdx, data.config, true);
    currentManoTavoli.push(table1);
    inGameIds.push(...table1);
  }

  // Altri tavoli ottimizzati social
  while (currentManoTavoli.length < numTavoli) {
    let table: string[] = [];
    table.push(availableToPlay.shift()!);

    for (let slot = 1; slot < 4; slot++) {
      availableToPlay.sort((a, b) => {
        let scoreA = 0; let scoreB = 0;
        table.forEach(pInTable => {
          scoreA += (encounterCounts[getPairKey(pInTable, a)] || 0);
          scoreB += (encounterCounts[getPairKey(pInTable, b)] || 0);
        });
        return scoreA - scoreB;
      });
      table.push(availableToPlay.shift()!);
    }

    const optimizedTable = optimizeTableSeating(table, data.storicoRelazioni, nextManoIdx, data.config, false);
    currentManoTavoli.push(optimizedTable);
    inGameIds.push(...optimizedTable);
  }

  const riposantiIds = sortedPlayers.map(p => p.id).filter(id => !inGameIds.includes(id));

  return {
    mano: nextManoIdx,
    tavoli: currentManoTavoli,
    riposanti: riposantiIds,
    fase: 'top'
  };
}