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
}

export const GamePage = ({ game, words, timeRemaining, feedback, onSubmitWord, onCancelGame, onEndGame }: GamePageProps) => {
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
      
      <div className="board-container">
        <Board board={game.board} onSubmitWord={onSubmitWord} feedback={feedback} />
      </div>
    </div>
  );
};
