import { useState, useRef, useEffect, useCallback } from 'react';
import { SharedBoard } from '../utils/boardCode';

interface ConfigPageProps {
  onStartGame: (boardSize: number, timeLimit: number, minWordLength: number) => void;
  onBack: () => void;
  sharedBoard?: SharedBoard | null;
}

const BOARD_SIZES = [4, 5, 6];
const TIME_LIMITS = [60, 120, -1];
const MIN_WORD_LENGTHS = [3, 4, 5];

const formatTime = (v: number) => v === -1 ? '∞' : `${v}s`;
const formatBoard = (v: number) => `${v}×${v}`;
const formatLength = (v: number) => `${v}`;

const SegmentedControl = ({ options, value, onChange, format, disabled = false }: {
  options: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  disabled?: boolean;
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
          className={`config-seg-btn ${i === activeIndex ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && onChange(v)}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
};

const generatePath = (startRow: number, length: number, boardSize: number): [number, number][] => {
  const path: [number, number][] = [];
  let row = startRow;
  let col = 0;
  for (let i = 0; i < length; i++) {
    path.push([row, col]);
    if (col < boardSize - 1) {
      col++;
    } else {
      row++;
      // stay at last column, just go down
    }
  }
  return path;
};

const PreviewBoard = ({ size, minWordLength, sharedBoard }: { size: number; minWordLength: number; sharedBoard?: string[][] | null }) => {
  const tooShortPath = sharedBoard ? [] : generatePath(0, minWordLength - 1, size);
  const validPath = sharedBoard ? [] : generatePath(1, minWordLength, size);

  const getCellHighlight = (row: number, col: number): string => {
    if (validPath.some(([r, c]) => r === row && c === col)) return 'preview-cell-valid';
    if (tooShortPath.some(([r, c]) => r === row && c === col)) return 'preview-cell-invalid';
    return '';
  };

  return (
    <div className="preview-board-wrapper">
      <div className="board base-frosted" style={{ pointerEvents: 'none' }}>
        {Array.from({ length: size }, (_, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {Array.from({ length: size }, (_, colIndex) => (
              <div key={`${rowIndex}-${colIndex}`} className={`cell ${getCellHighlight(rowIndex, colIndex)}`}>
                {sharedBoard?.[rowIndex]?.[colIndex] || ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="preview-board-fade" />
    </div>
  );
};

const STORAGE_KEY = 'froggle-config';

const loadSavedConfig = (): { boardSize: number; timeLimit: number; minWordLength: number } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        boardSize: BOARD_SIZES.includes(parsed.boardSize) ? parsed.boardSize : 4,
        timeLimit: TIME_LIMITS.includes(parsed.timeLimit) ? parsed.timeLimit : 120,
        minWordLength: MIN_WORD_LENGTHS.includes(parsed.minWordLength) ? parsed.minWordLength : 3,
      };
    }
  } catch { /* ignore */ }
  return { boardSize: 4, timeLimit: 120, minWordLength: 3 };
};

const saveConfig = (boardSize: number, timeLimit: number, minWordLength: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ boardSize, timeLimit, minWordLength }));
  } catch { /* ignore */ }
};

export const ConfigPage = ({ onStartGame, sharedBoard }: ConfigPageProps) => {
  const saved = loadSavedConfig();
  const isShared = !!sharedBoard;
  const [boardSize, setBoardSize] = useState<number>(sharedBoard?.boardSize ?? saved.boardSize);
  const [timeLimit, setTimeLimit] = useState<number>(sharedBoard?.timeLimit ?? saved.timeLimit);
  const [minWordLength, setMinWordLength] = useState<number>(sharedBoard?.minWordLength ?? saved.minWordLength);

  const handleStartGame = () => {
    saveConfig(boardSize, timeLimit, minWordLength);
    onStartGame(boardSize, timeLimit, minWordLength);
  };

  const timerDisplay = timeLimit > 0 ? `${timeLimit}s` : '∞';

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
              <PreviewBoard size={boardSize} minWordLength={minWordLength} sharedBoard={sharedBoard?.board} />
            </div>
          </div>
        </div>

        {isShared && <div className="shared-board-label">Shared Board</div>}

        <div className="config-segmented">
          <div className="config-seg-row">
            <div className="config-seg-label">Board Size</div>
            <SegmentedControl options={BOARD_SIZES} value={boardSize} onChange={setBoardSize} format={formatBoard} disabled={isShared} />
          </div>
          <div className="config-seg-row">
            <div className="config-seg-label">Time Limit</div>
            <SegmentedControl options={TIME_LIMITS} value={timeLimit} onChange={setTimeLimit} format={formatTime} disabled={isShared} />
          </div>
          <div className="config-seg-row">
            <div className="config-seg-label">Min Letters</div>
            <SegmentedControl options={MIN_WORD_LENGTHS} value={minWordLength} onChange={setMinWordLength} format={formatLength} disabled={isShared} />
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
