import { useRef } from 'react';

interface TimeLimitConfigProps {
  value: number;
  onChange: (value: number) => void;
}

export function TimeLimitConfig({ value, onChange }: TimeLimitConfigProps) {
  const dragStartX = useRef<number>(0);
  const dragEndX = useRef<number>(0);

  const options = [60, 120, -1];
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

  const formatDisplay = () => {
    return value === -1 ? '∞' : `${value / 60} min${value > 60 ? 's' : ''}`;
  };

  const formatLabel = () => {
    return value === -1 ? 'No Limit' : `${value / 60} min${value > 60 ? 's' : ''}`;
  };

  return (
    <div className="config-section">
      <label>Time Limit</label>
      <div 
        className="config-display-box"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {formatDisplay()}
      </div>
      <div className="config-navigator">
        <button 
          onClick={decrease} 
          className="nav-arrow"
          disabled={isAtMin}
        >
          ←
        </button>
        <span className="nav-label">{formatLabel()}</span>
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
