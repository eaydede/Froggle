import { useRef } from 'react';

interface BoardSizeConfigProps {
  value: number;
  onChange: (value: number) => void;
}

export function BoardSizeConfig({ value, onChange }: BoardSizeConfigProps) {
  const dragStartX = useRef<number>(0);
  const dragEndX = useRef<number>(0);

  const options = [4, 5, 6];
  const currentIndex = options.indexOf(value);
  const isAtMin = currentIndex === 0;
  const isAtMax = currentIndex === options.length - 1;

  const decrease = () => {
    if (currentIndex > 0) {
      onChange(options[currentIndex - 1]);
    }
  };

  const increase = () => {
    if (currentIndex < options.length - 1) {
      onChange(options[currentIndex + 1]);
    }
  };

  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX;
  };

  const handleDragEnd = (clientX: number) => {
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

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleDragEnd(e.changedTouches[0].clientX);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    handleDragEnd(e.clientX);
  };

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
        className="config-display-box"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {renderGrid()}
      </div>
      <div className="config-navigator">
        <button 
          onClick={decrease} 
          className="nav-arrow"
          disabled={isAtMin}
        >
          ←
        </button>
        <span className="nav-label">{value}x{value}</span>
        <button 
          onClick={increase} 
          className="nav-arrow"
          disabled={isAtMax}
        >
          →
        </button>
      </div>
    </div>
  );
}
