import { Board } from 'models';
// The 16 standard Boggle dice
const DICE4x4 = [
  ['A', 'A', 'F', 'K', 'P', 'S'],
  ['A', 'A', 'E', 'E', 'G', 'N'],
  ['A', 'V', 'I', 'D', 'Y', 'N'],
  ['C', 'M', 'P', 'F', 'E', 'D'],
  ['I', 'C', 'N', 'S', 'S', 'P'],
  ['D', 'R', 'L', 'G', 'E', 'U'],
  ['P', 'C', 'K', 'H', 'D', 'Qu'],
  ['B', 'U', 'E', 'C', 'L', 'S'],
  ['E', 'M', 'N', 'I', 'Q', 'Z'],
  ['B', 'G', 'L', 'E', 'N', 'Y'],
  ['O', 'U', 'T', 'E', 'S', 'P'],
  ['A', 'H', 'M', 'O', 'C', 'S'],
  ['T', 'I', 'I', 'L', 'Z', 'R'],
  ['R', 'D', 'E', 'L', 'L', 'O'],
  ['H', 'N', 'I', 'R', 'T', 'L'],
  ['I', 'D', 'R', 'T', 'Y', 'L'],
];

export function generateBoard(): Board {

    const letters = shuffle(DICE4x4.map(die => roll(die)))
    const board = [
        letters.slice(0, 4),
        letters.slice(4, 8),
        letters.slice(8, 12),
        letters.slice(12, 16),
    ]
    
    return board
}

function roll(die: string[]): string {
    return die[Math.floor(Math.random()*die.length)]
}

function shuffle(letters: string[]): string[] {
    const shuffled = [...letters]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}