import { useState } from 'react';

interface ConfigPageProps {
  onStartGame: (boardSize: number, timeLimit: number) => void;
  onBack: () => void;
}

export const ConfigPage = ({ onStartGame, onBack }: ConfigPageProps) => {
  const [boardSize, setBoardSize] = useState<number>(4);
  const [timeLimit, setTimeLimit] = useState<number>(180);

  const handleStartGame = () => {
    onStartGame(boardSize, timeLimit);
  };

  return (
    <div className="config-screen">
      <div className="config-container">
        <h2>Game Settings</h2>
        
        <div className="config-section">
          <label htmlFor="board-size">Board Size:</label>
          <div className="config-options">
            <button
              className={`config-option ${boardSize === 4 ? 'selected' : ''}`}
              onClick={() => setBoardSize(4)}
            >
              4x4
            </button>
            <button
              className={`config-option ${boardSize === 5 ? 'selected' : ''}`}
              onClick={() => setBoardSize(5)}
            >
              5x5
            </button>
            <button
              className={`config-option ${boardSize === 6 ? 'selected' : ''}`}
              onClick={() => setBoardSize(6)}
            >
              6x6
            </button>
          </div>
        </div>

        <div className="config-section">
          <label htmlFor="time-limit">Time Limit:</label>
          <div className="config-options">
            <button
              className={`config-option ${timeLimit === 60 ? 'selected' : ''}`}
              onClick={() => setTimeLimit(60)}
            >
              1 min
            </button>
            <button
              className={`config-option ${timeLimit === 120 ? 'selected' : ''}`}
              onClick={() => setTimeLimit(120)}
            >
              2 min
            </button>
            <button
              className={`config-option ${timeLimit === 180 ? 'selected' : ''}`}
              onClick={() => setTimeLimit(180)}
            >
              3 min
            </button>
            <button
              className={`config-option ${timeLimit === 240 ? 'selected' : ''}`}
              onClick={() => setTimeLimit(240)}
            >
              4 min
            </button>
            <button
              className={`config-option ${timeLimit === 300 ? 'selected' : ''}`}
              onClick={() => setTimeLimit(300)}
            >
              5 min
            </button>
            <button
              className={`config-option ${timeLimit === -1 ? 'selected' : ''}`}
              onClick={() => setTimeLimit(-1)}
            >
              Unlimited
            </button>
          </div>
        </div>

        <div className="config-buttons">
          <button onClick={onBack} className="back-button">
            Back
          </button>
          <button onClick={handleStartGame} className="start-button">
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};
