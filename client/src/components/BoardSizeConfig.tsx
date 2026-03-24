import { useSwipe } from '../hooks/useSwipe';

interface BoardSizeConfigProps {
  value: number;
  onChange: (value: number) => void;
}

export function BoardSizeConfig({ value, onChange }: BoardSizeConfigProps) {
  const options = [4, 5, 6];
  const currentIndex = options.indexOf(value);
  const isAtMin = currentIndex === 0;
  const isAtMax = currentIndex === options.length - 1;

  const decrease = () => {
    if (currentIndex > 0) onChange(options[currentIndex - 1]);
  };

  const increase = () => {
    if (currentIndex < options.length - 1) onChange(options[currentIndex + 1]);
  };

  const { elementRef, handleMouseDown, handleMouseUp } = useSwipe(decrease, increase);

  const renderGrid = () => {
    const cellSize = value === 4 ? 25 : value === 5 ? 20 : 16;
    const gap = value === 4 ? 6 : value === 5 ? 5 : 4;
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${value}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${value}, ${cellSize}px)`,
        gap: `${gap}px`,
      }}>
        {Array.from({ length: value * value }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#2196F3',
              borderRadius: '3px',
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="config-section">
      <label>Board Size</label>
      <div 
        ref={elementRef}
        className="config-display-box"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {renderGrid()}
      </div>
      <div className="config-navigator">
        <button onClick={decrease} className="nav-arrow" disabled={isAtMin}>←</button>
        <span className="nav-label">{value}x{value}</span>
        <button onClick={increase} className="nav-arrow" disabled={isAtMax}>→</button>
      </div>
    </div>
  );
}
