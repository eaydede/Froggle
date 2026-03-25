import { Game, Position, Word } from 'models';
import { Board, FeedbackType } from '../components/Board';
import { TimerBar } from '../components/TimerBar';

interface GamePageProps {
  game: Game;
  words: Word[];
  timeRemaining: number;
  feedback: { type: FeedbackType; path: Position[] } | null;
  onSubmitWord: (path: Position[]) => void;
  onCancelGame: () => void;
  onEndGame: () => void;
  debugMode: boolean;
  dwellTime: number;
  onDwellTimeChange: (value: number) => void;
}

export const GamePage = ({ game, timeRemaining, feedback, onSubmitWord, onEndGame, debugMode, dwellTime, onDwellTimeChange }: GamePageProps) => {
  const boardSize = game.board.length;
  
  return (
    <div className="game-screen" style={{ '--board-size': boardSize } as React.CSSProperties}>
      <div className="timer-section">
        <div className="timer-display">{timeRemaining > 0 ? `${timeRemaining}s` : 'Unlimited'}</div>
        <TimerBar game={game} />
        <button onClick={onEndGame} className="icon-button end-game-icon" aria-label="End game">
          ✕
        </button>
      </div>

      {debugMode && (
        <div className="dwell-control">
          <button onClick={() => onDwellTimeChange(Math.max(0, dwellTime - 10))}>−</button>
          <span>{dwellTime}ms</span>
          <button onClick={() => onDwellTimeChange(dwellTime + 10)}>+</button>
        </div>
      )}
      
      <div className="board-container">
        <div className="board-with-word">
          <Board board={game.board} onSubmitWord={onSubmitWord} feedback={feedback} dwellTime={dwellTime} />
        </div>
      </div>
    </div>
  );
};
