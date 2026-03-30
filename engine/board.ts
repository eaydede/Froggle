import { Board } from 'models';
import { mulberry32 } from 'models/seedCode';

// The 16 standard Boggle dice for 4x4
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

// 25 dice for 5x5 Big Boggle
const DICE5x5 = [
  ['A', 'A', 'A', 'F', 'R', 'S'],
  ['A', 'A', 'E', 'E', 'E', 'E'],
  ['A', 'A', 'F', 'I', 'R', 'S'],
  ['A', 'D', 'E', 'N', 'N', 'N'],
  ['A', 'E', 'E', 'E', 'E', 'M'],
  ['A', 'E', 'E', 'G', 'M', 'U'],
  ['A', 'E', 'G', 'M', 'N', 'N'],
  ['A', 'F', 'I', 'R', 'S', 'Y'],
  ['B', 'J', 'K', 'Qu', 'X', 'Z'],
  ['C', 'C', 'E', 'N', 'S', 'T'],
  ['C', 'E', 'I', 'I', 'L', 'T'],
  ['C', 'E', 'I', 'L', 'P', 'T'],
  ['C', 'E', 'I', 'P', 'S', 'T'],
  ['D', 'D', 'H', 'N', 'O', 'T'],
  ['D', 'H', 'H', 'L', 'O', 'R'],
  ['D', 'H', 'L', 'N', 'O', 'R'],
  ['D', 'H', 'L', 'N', 'O', 'R'],
  ['E', 'I', 'I', 'I', 'T', 'T'],
  ['E', 'M', 'O', 'T', 'T', 'T'],
  ['E', 'N', 'S', 'S', 'S', 'U'],
  ['F', 'I', 'P', 'R', 'S', 'Y'],
  ['G', 'O', 'R', 'R', 'V', 'W'],
  ['I', 'P', 'R', 'R', 'R', 'Y'],
  ['N', 'O', 'O', 'T', 'U', 'W'],
  ['O', 'O', 'O', 'T', 'T', 'U'],
];

// 36 dice for 6x6 Super Big Boggle
const DICE6x6 = [
  ['A', 'A', 'A', 'F', 'R', 'S'],
  ['A', 'A', 'E', 'E', 'E', 'E'],
  ['A', 'A', 'E', 'E', 'O', 'O'],
  ['A', 'A', 'F', 'I', 'R', 'S'],
  ['A', 'B', 'D', 'E', 'I', 'O'],
  ['A', 'D', 'E', 'N', 'N', 'N'],
  ['A', 'E', 'E', 'E', 'E', 'M'],
  ['A', 'E', 'E', 'G', 'M', 'U'],
  ['A', 'E', 'G', 'M', 'N', 'N'],
  ['A', 'F', 'I', 'R', 'S', 'Y'],
  ['A', 'N', 'O', 'T', 'H', 'E'],
  ['B', 'J', 'K', 'Qu', 'X', 'Z'],
  ['C', 'C', 'E', 'N', 'S', 'T'],
  ['C', 'D', 'D', 'L', 'N', 'N'],
  ['C', 'E', 'I', 'I', 'L', 'T'],
  ['C', 'E', 'I', 'L', 'P', 'T'],
  ['C', 'E', 'I', 'P', 'S', 'T'],
  ['C', 'F', 'G', 'N', 'U', 'Y'],
  ['D', 'D', 'H', 'N', 'O', 'T'],
  ['D', 'H', 'H', 'L', 'O', 'R'],
  ['D', 'H', 'H', 'N', 'O', 'W'],
  ['D', 'H', 'L', 'N', 'O', 'R'],
  ['E', 'H', 'I', 'L', 'R', 'S'],
  ['E', 'I', 'I', 'L', 'S', 'T'],
  ['E', 'I', 'L', 'P', 'S', 'T'],
  ['E', 'I', 'O', 'Qu', 'U', 'V'],
  ['E', 'M', 'O', 'T', 'T', 'T'],
  ['E', 'N', 'S', 'S', 'S', 'U'],
  ['F', 'I', 'P', 'R', 'S', 'Y'],
  ['G', 'O', 'R', 'R', 'V', 'W'],
  ['H', 'I', 'P', 'R', 'R', 'Y'],
  ['I', 'N', 'Qu', 'U', 'M', 'N'],
  ['L', 'E', 'E', 'S', 'T', 'R'],
  ['N', 'O', 'O', 'T', 'U', 'W'],
  ['O', 'O', 'O', 'T', 'T', 'U'],
  ['O', 'S', 'S', 'O', 'T', 'T'],
];

function getDice(size: number): string[][] {
    switch (size) {
        case 5: return DICE5x5;
        case 6: return DICE6x6;
        case 4:
        default: return DICE4x4;
    }
}

export function generateBoard(size: number = 4): Board {
    const dice = getDice(size);
    const letters = shuffle(dice.map(die => roll(die, Math.random)), Math.random);
    const board: Board = [];
    
    for (let i = 0; i < size; i++) {
        board.push(letters.slice(i * size, (i + 1) * size));
    }
    
    return board;
}

export function generateSeededBoard(size: number, seed: number): Board {
    const rng = mulberry32(seed);
    const dice = getDice(size);
    const letters = shuffle(dice.map(die => roll(die, rng)), rng);
    const board: Board = [];

    for (let i = 0; i < size; i++) {
        board.push(letters.slice(i * size, (i + 1) * size));
    }

    return board;
}

function roll(die: string[], random: () => number): string {
    return die[Math.floor(random() * die.length)];
}

function shuffle(letters: string[], random: () => number): string[] {
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}