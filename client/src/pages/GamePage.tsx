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
  const boardSize = game.board.length;
  
  return (
    <div className="game-screen" style={{ '--board-size': boardSize } as React.CSSProperties}>
      <div className="game-info">
        <div className="timer">Time: {timeRemaining > 0 ? `${timeRemaining}s` : 'Unlimited'}</div>
        <div className="score">Words: {words.length}</div>
      </div>
      
      <Board board={game.board} onSubmitWord={onSubmitWord} />
      
      {message && <div className="message">{message}</div>}
      
      <FoundWords words={words} />
    </div>
  );
};
