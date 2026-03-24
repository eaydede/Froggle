import { useSwipe } from '../hooks/useSwipe';

interface MinWordLengthConfigProps {
  value: number;
  onChange: (value: number) => void;
}

export function MinWordLengthConfig({ value, onChange }: MinWordLengthConfigProps) {
  const options = [3, 4, 5];
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

  const formatLabel = () => {
    return `${value} letter${value > 1 ? 's' : ''}`;
  };

  return (
    <div className="config-section">
      <label>Min Word Length</label>
      <div 
        ref={elementRef}
        className="config-display-box"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {value}
      </div>
      <div className="config-navigator">
        <button onClick={decrease} className="nav-arrow" disabled={isAtMin}>←</button>
        <span className="nav-label">{formatLabel()}</span>
        <button onClick={increase} className="nav-arrow" disabled={isAtMax}>→</button>
      </div>
    </div>
  );
}
