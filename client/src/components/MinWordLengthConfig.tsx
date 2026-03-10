import { useRef } from 'react';

interface MinWordLengthConfigProps {
  value: number;
  onChange: (value: number) => void;
}

export function MinWordLengthConfig({ value, onChange }: MinWordLengthConfigProps) {
  const dragStartX = useRef<number>(0);
  const dragEndX = useRef<number>(0);

  const options = [3, 4, 5];
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

  const formatLabel = () => {
    return `${value} letter${value > 1 ? 's' : ''}`;
  };

  return (
    <div className="config-section">
      <label>Min Word Length</label>
      <div 
        className="config-display-box"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {value}
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
