import { Game, Position, Word } from 'models';
import { Board } from '../components/Board';
import { FoundWords } from '../components/FoundWords';

interface GamePageProps {
  game: Game;
  words: Word[];
  timeRemaining: number;
  message: string;
  onSubmitWord: (path: Position[]) => void;
}

export const GamePage = ({ game, words, timeRemaining, message, onSubmitWord }: GamePageProps) => {
  return (
    <div className="game-screen">
      <div className="game-info">
        <div className="timer">Time: {timeRemaining}s</div>
        <div className="score">Words: {words.length}</div>
      </div>
      
      <Board board={game.board} onSubmitWord={onSubmitWord} />
      
      {message && <div className="message">{message}</div>}
      
      <FoundWords words={words} />
    </div>
  );
};
