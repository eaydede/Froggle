import { Word } from 'models';

interface ResultsPageProps {
  words: Word[];
  onPlayAgain: () => void;
}

export const ResultsPage = ({ words, onPlayAgain }: ResultsPageProps) => {
  return (
    <div className="start-screen">
      <div className="results">
        <h2>Game Over!</h2>
        <p>Words Found: {words.length}</p>
        <div className="words-list">
          {words.map((w, i) => (
            <div key={i} className="word-item">{w.word}</div>
          ))}
        </div>
      </div>
      
      <button onClick={onPlayAgain} className="start-button">
        Play Again
      </button>
    </div>
  );
};
