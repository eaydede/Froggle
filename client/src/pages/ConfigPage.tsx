import { useState } from 'react';
import { BoardSizeConfig } from '../components/BoardSizeConfig';
import { TimeLimitConfig } from '../components/TimeLimitConfig';
import { MinWordLengthConfig } from '../components/MinWordLengthConfig';

interface ConfigPageProps {
  onStartGame: (boardSize: number, timeLimit: number, minWordLength: number) => void;
  onBack: () => void;
}

export const ConfigPage = ({ onStartGame, onBack }: ConfigPageProps) => {
  const [boardSize, setBoardSize] = useState<number>(4);
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [minWordLength, setMinWordLength] = useState<number>(3);

  const handleStartGame = () => {
    onStartGame(boardSize, timeLimit, minWordLength);
  };

  return (
    <div className="config-screen">
      <div className="config-container">
        <div className="config-sections-row">
          <BoardSizeConfig value={boardSize} onChange={setBoardSize} />
          <TimeLimitConfig value={timeLimit} onChange={setTimeLimit} />
          <MinWordLengthConfig value={minWordLength} onChange={setMinWordLength} />
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
