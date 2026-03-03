import { Game, Position, Word } from 'models';
import { Board } from '../components/Board';
import { FoundWords } from '../components/FoundWords';
import { TimerBar } from '../components/TimerBar';

interface GamePageProps {
  game: Game;
  words: Word[];
  timeRemaining: number;
  message: string;
  onSubmitWord: (path: Position[]) => void;
  onCancelGame: () => void;
  onEndGame: () => void;
}

export const GamePage = ({ game, words, timeRemaining, message, onSubmitWord, onCancelGame, onEndGame }: GamePageProps) => {
  const boardSize = game.board.length;
  
  return (
    <div className="game-screen" style={{ '--board-size': boardSize } as React.CSSProperties}>
      <div className="game-header">
        <div className="game-info">
          <div className="timer">Time: {timeRemaining > 0 ? `${timeRemaining}s` : 'Unlimited'}</div>
          <div className="score">Words: {words.length}</div>
        </div>
        <div className="game-actions">
          <button onClick={onEndGame} className="end-game-button">
            End Game
          </button>
          <button onClick={onCancelGame} className="cancel-game-button">
            Cancel
          </button>
        </div>
      </div>

      <TimerBar game={game} />
      
      <Board board={game.board} onSubmitWord={onSubmitWord} />
      
      {message && <div className="message">{message}</div>}
      
      <FoundWords words={words} />
    </div>
  );
};
