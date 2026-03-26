import { useState, useRef, useEffect, useCallback } from 'react';
import { Board } from '../components/Board';

interface ConfigPageProps {
  onStartGame: (boardSize: number, timeLimit: number, minWordLength: number) => void;
  onBack: () => void;
}

const BOARD_SIZES = [4, 5, 6];
const TIME_LIMITS = [60, 120, -1];
const MIN_WORD_LENGTHS = [3, 4, 5];

const formatTime = (v: number) => v === -1 ? '∞' : `${v}s`;
const formatBoard = (v: number) => `${v}×${v}`;
const formatLength = (v: number) => `${v}`;

const SegmentedControl = ({ options, value, onChange, format }: {
  options: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) => {
  const controlRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const activeIndex = options.indexOf(value);

  const updateSlider = useCallback(() => {
    const control = controlRef.current;
    if (!control) return;
    const buttons = control.querySelectorAll<HTMLButtonElement>('.config-seg-btn');
    const activeBtn = buttons[activeIndex];
    if (!activeBtn) return;

    const controlRect = control.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    setSliderStyle({
      left: btnRect.left - controlRect.left,
      width: btnRect.width,
    });
  }, [activeIndex]);

  useEffect(() => {
    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [updateSlider]);

  return (
    <div className="config-seg-control" ref={controlRef}>
      <div
        className="config-seg-slider"
        style={{
          width: `${sliderStyle.width}px`,
          left: `${sliderStyle.left}px`,
        }}
      />
      {options.map((v, i) => (
        <button
          key={v}
          className={`config-seg-btn ${i === activeIndex ? 'active' : ''}`}
          onClick={() => onChange(v)}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
};

const PreviewBoard = ({ size }: { size: number }) => {
  const board = Array.from({ length: size }, () => Array.from({ length: size }, () => ''));
  const noop = () => {};

  return (
    <Board
      board={board}
      onSubmitWord={noop}
      feedback={null}
      baseStyleIndex={1}
      hoverStyleIndex={0}
      pressStyleIndex={3}
    />
  );
};

export const ConfigPage = ({ onStartGame }: ConfigPageProps) => {
  const [boardSize, setBoardSize] = useState<number>(4);
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [minWordLength, setMinWordLength] = useState<number>(3);

  const handleStartGame = () => {
    onStartGame(boardSize, timeLimit, minWordLength);
  };

  const timerDisplay = timeLimit > 0 ? `${timeLimit}s` : 'Unlimited';

  return (
    <div className="config-screen">
      <div className="config-container">
        <div className="game-screen config-preview" style={{ '--board-size': boardSize } as React.CSSProperties}>
          <div className="timer-section">
            <div className="timer-display">{timerDisplay}</div>
            <div className="timer-bar-container">
              <div className="timer-bar-fill" style={{ width: '100%' }} />
            </div>
            <div className="icon-button end-game-icon">✕</div>
          </div>

          <div className="board-container">
            <div className="board-with-word">
              <PreviewBoard size={boardSize} />
            </div>
          </div>
        </div>

        <div className="config-segmented">
          <div className="config-seg-row">
            <div className="config-seg-label">Board Size</div>
            <SegmentedControl options={BOARD_SIZES} value={boardSize} onChange={setBoardSize} format={formatBoard} />
          </div>
          <div className="config-seg-row">
            <div className="config-seg-label">Time Limit</div>
            <SegmentedControl options={TIME_LIMITS} value={timeLimit} onChange={setTimeLimit} format={formatTime} />
          </div>
          <div className="config-seg-row">
            <div className="config-seg-label">Min Letters</div>
            <SegmentedControl options={MIN_WORD_LENGTHS} value={minWordLength} onChange={setMinWordLength} format={formatLength} />
          </div>
        </div>

        <div className="config-buttons">
          <button onClick={handleStartGame} className="start-button">
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};
