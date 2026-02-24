import { GameStatus, Word } from 'models';
import { FoundWords } from '../components/FoundWords';

interface StartPageProps {
  onStartGame: () => void;
  gameStatus?: GameStatus;
  words?: Word[];
}

export const StartPage = ({ onStartGame, gameStatus, words = [] }: StartPageProps) => {
  return (
    <div className="start-screen">
      <button onClick={onStartGame} className="start-button">
        {gameStatus === GameStatus.Finished ? 'Play Again' : 'Start Game'}
      </button>
      
      {gameStatus === GameStatus.Finished && (
        <div className="results">
          <h2>Game Over!</h2>
          <p>Words Found: {words.length}</p>
          <div className="words-list">
            {words.map((w, i) => (
              <div key={i} className="word-item">{w.word}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
