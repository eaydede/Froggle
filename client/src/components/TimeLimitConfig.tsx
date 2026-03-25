import { useSwipe } from '../hooks/useSwipe';

interface TimeLimitConfigProps {
  value: number;
  onChange: (value: number) => void;
}

export function TimeLimitConfig({ value, onChange }: TimeLimitConfigProps) {
  const options = [60, 120, -1];
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

  const formatDisplay = () => {
    return value === -1 ? '∞' : `${value}s`;
  };

  const formatLabel = () => {
    return value === -1 ? 'No Limit' : `${value}s`;
  };

  return (
    <div className="config-section">
      <label>Time Limit</label>
      <div 
        ref={elementRef}
        className="config-display-box config-style-soft config-color-time"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {formatDisplay()}
      </div>
      <div className="config-navigator">
        <button onClick={decrease} className="nav-arrow" disabled={isAtMin}>←</button>
        <span className="nav-label">{formatLabel()}</span>
        <button onClick={increase} className="nav-arrow" disabled={isAtMax}>→</button>
      </div>
    </div>
  );
}
