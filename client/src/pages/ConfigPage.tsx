import { useState, useRef } from 'react';

interface ConfigPageProps {
  onStartGame: (boardSize: number, timeLimit: number, minWordLength: number) => void;
  onBack: () => void;
}

export const ConfigPage = ({ onStartGame, onBack }: ConfigPageProps) => {
  const [boardSize, setBoardSize] = useState<number>(4);
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [minWordLength, setMinWordLength] = useState<number>(3);

  const dragStartX = useRef<number>(0);
  const dragEndX = useRef<number>(0);

  const boardSizeOptions = [4, 5, 6];
  const timeLimitOptions = [60, 120, -1];
  const minWordLengthOptions = [3, 4, 5];

  const formatBoardSize = (size: number) => `${size}x${size}`;
  const formatTimeLimit = (time: number) => time === -1 ? '∞' : `${time / 60} min${time > 60 ? 's' : ''}`;
  const formatTimeLimitLabel = (time: number) => time === -1 ? 'No Limit' : `${time / 60} min${time > 60 ? 's' : ''}`;
  const formatMinWordLength = (length: number) => `${length} letter${length > 1 ? 's' : ''}`;

  const decreaseBoardSize = () => {
    const currentIndex = boardSizeOptions.indexOf(boardSize);
    if (currentIndex > 0) {
      setBoardSize(boardSizeOptions[currentIndex - 1]);
    }
  };

  const increaseBoardSize = () => {
    const currentIndex = boardSizeOptions.indexOf(boardSize);
    if (currentIndex < boardSizeOptions.length - 1) {
      setBoardSize(boardSizeOptions[currentIndex + 1]);
    }
  };

  const decreaseTimeLimit = () => {
    const currentIndex = timeLimitOptions.indexOf(timeLimit);
    if (currentIndex > 0) {
      setTimeLimit(timeLimitOptions[currentIndex - 1]);
    }
  };

  const increaseTimeLimit = () => {
    const currentIndex = timeLimitOptions.indexOf(timeLimit);
    if (currentIndex < timeLimitOptions.length - 1) {
      setTimeLimit(timeLimitOptions[currentIndex + 1]);
    }
  };

  const decreaseMinWordLength = () => {
    const currentIndex = minWordLengthOptions.indexOf(minWordLength);
    if (currentIndex > 0) {
      setMinWordLength(minWordLengthOptions[currentIndex - 1]);
    }
  };

  const increaseMinWordLength = () => {
    const currentIndex = minWordLengthOptions.indexOf(minWordLength);
    if (currentIndex < minWordLengthOptions.length - 1) {
      setMinWordLength(minWordLengthOptions[currentIndex + 1]);
    }
  };

  const isBoardSizeAtMin = boardSize === boardSizeOptions[0];
  const isBoardSizeAtMax = boardSize === boardSizeOptions[boardSizeOptions.length - 1];
  const isTimeLimitAtMin = timeLimit === timeLimitOptions[0];
  const isTimeLimitAtMax = timeLimit === timeLimitOptions[timeLimitOptions.length - 1];
  const isMinWordLengthAtMin = minWordLength === minWordLengthOptions[0];
  const isMinWordLengthAtMax = minWordLength === minWordLengthOptions[minWordLengthOptions.length - 1];

  const handleStartGame = () => {
    onStartGame(boardSize, timeLimit, minWordLength);
  };

  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX;
  };

  const handleDragEnd = (clientX: number, decrease: () => void, increase: () => void) => {
    dragEndX.current = clientX;
    const swipeDistance = dragEndX.current - dragStartX.current;
    const minSwipeDistance = 20;

    if (swipeDistance > minSwipeDistance) {
      decrease();
    } else if (swipeDistance < -minSwipeDistance) {
      increase();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent, decrease: () => void, increase: () => void) => {
    handleDragEnd(e.changedTouches[0].clientX, decrease, increase);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent, decrease: () => void, increase: () => void) => {
    handleDragEnd(e.clientX, decrease, increase);
  };

  return (
    <div className="config-screen">
      <div className="config-container">
        <div className="config-sections-row">
          <div className="config-section">
            <label>Board Size</label>
            <div 
              className="config-display-box"
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, decreaseBoardSize, increaseBoardSize)}
              onMouseDown={handleMouseDown}
              onMouseUp={(e) => handleMouseUp(e, decreaseBoardSize, increaseBoardSize)}
            >
              {formatBoardSize(boardSize)}
            </div>
            <div className="config-navigator">
              <button 
                onClick={decreaseBoardSize} 
                className="nav-arrow"
                disabled={isBoardSizeAtMin}
              >
                ←
              </button>
              <span className="nav-label">{formatBoardSize(boardSize)}</span>
              <button 
                onClick={increaseBoardSize} 
                className="nav-arrow"
                disabled={isBoardSizeAtMax}
              >
                →
              </button>
            </div>
          </div>

          <div className="config-section">
            <label>Time Limit</label>
            <div 
              className="config-display-box"
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, decreaseTimeLimit, increaseTimeLimit)}
              onMouseDown={handleMouseDown}
              onMouseUp={(e) => handleMouseUp(e, decreaseTimeLimit, increaseTimeLimit)}
            >
              {formatTimeLimit(timeLimit)}
            </div>
            <div className="config-navigator">
              <button 
                onClick={decreaseTimeLimit} 
                className="nav-arrow"
                disabled={isTimeLimitAtMin}
              >
                ←
              </button>
              <span className="nav-label">{formatTimeLimitLabel(timeLimit)}</span>
              <button 
                onClick={increaseTimeLimit} 
                className="nav-arrow"
                disabled={isTimeLimitAtMax}
              >
                →
              </button>
            </div>
          </div>

          <div className="config-section">
            <label>Min Word Length</label>
            <div 
              className="config-display-box"
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, decreaseMinWordLength, increaseMinWordLength)}
              onMouseDown={handleMouseDown}
              onMouseUp={(e) => handleMouseUp(e, decreaseMinWordLength, increaseMinWordLength)}
            >
              {minWordLength}
            </div>
            <div className="config-navigator">
              <button 
                onClick={decreaseMinWordLength} 
                className="nav-arrow"
                disabled={isMinWordLengthAtMin}
              >
                ←
              </button>
              <span className="nav-label">{formatMinWordLength(minWordLength)}</span>
              <button 
                onClick={increaseMinWordLength} 
                className="nav-arrow"
                disabled={isMinWordLengthAtMax}
              >
                →
              </button>
            </div>
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
