interface DebugInfo {
  lastMousePos: { x: number; y: number } | null;
  currentMousePos: { x: number; y: number } | null;
  deltaX: number;
  deltaY: number;
  ratio: number;
  isMovingDiagonally: boolean;
  isDiagonalCell: boolean;
  isOrthogonalCell: boolean;
  movementDirection?: 'horizontal' | 'vertical' | 'diagonal';
  threshold: number;
  timestamp: number;
  cellCoords?: { row: number; col: number };
  fromCell?: { row: number; col: number; letter: string } | null;
  toCell?: { row: number; col: number; letter: string };
  wasPending?: boolean;
  pathAction?: 'added' | 'skipped' | 'backtracked' | 'pending';
  pathBeforeMove?: string;
  pathAfterMove?: string;
  startSource?: string;
  endSource?: string;
}

interface CoordLogEntry {
  x: number;
  y: number;
  source: string;
  timestamp: number;
}

interface DebugOverlayProps {
  debugHistory: DebugInfo[];
  pendingCell: { row: number; col: number; timestamp: number } | null;
  enabled: boolean;
  boardSize: number;
  cellSize: number;
  board: string[][];
  coordLog: CoordLogEntry[];
}

export const DebugOverlay = ({ debugHistory, pendingCell, enabled, boardSize, cellSize, board, coordLog }: DebugOverlayProps) => {
  if (!enabled) return null;
  
  // Disable debug overlay on mobile devices
  if (typeof window !== 'undefined' && window.innerWidth <= 600) {
    return null;
  }

  const renderCoordLog = () => {
    if (coordLog.length === 0) return null;
    
    return (
      <div className="debug-coord-log">
        <div className="debug-coord-log-header">📍 Coordinate Log</div>
        <div className="debug-coord-log-entries">
          {coordLog.slice(-10).map((entry, index) => (
            <div key={index} className="debug-coord-entry">
              <div className="debug-coord-entry-header">
                <span className="debug-coord-entry-label">X,Y:</span>
                <span className="debug-coord-entry-value">{entry.x.toFixed(1)}, {entry.y.toFixed(1)}</span>
              </div>
              <div className="debug-coord-entry-source" title={entry.source}>
                {entry.source}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const copyDebugInfo = () => {
    const recentMoves = debugHistory.slice(-3).reverse();
    
    const text = recentMoves.map((info, index) => {
      const label = index === 0 ? 'Current Move' : index === 1 ? 'Previous Move' : '2 Moves Ago';
      
      let output = `=== ${label} ===\n`;
      
      if (info.fromCell && info.toCell) {
        output += `From Cell: [${info.fromCell.row}, ${info.fromCell.col}] "${info.fromCell.letter}"\n`;
        output += `To Cell: [${info.toCell.row}, ${info.toCell.col}] "${info.toCell.letter}"\n`;
      }
      
      if (info.pathBeforeMove !== undefined || info.pathAfterMove) {
        output += `Path Before: "${info.pathBeforeMove || '(empty)'}"\n`;
        output += `Path After: "${info.pathAfterMove || info.pathBeforeMove || '(empty)'}"\n`;
        
        let actionSymbol = '?';
        if (info.pathAction === 'added') actionSymbol = '+';
        else if (info.pathAction === 'skipped') actionSymbol = '⊘';
        else if (info.pathAction === 'backtracked') actionSymbol = '←';
        else if (info.pathAction === 'pending') actionSymbol = '⏳';
        
        output += `Action: ${actionSymbol} ${info.toCell?.letter || ''} (${info.pathAction})\n`;
      }
      
      output += `\nMouse Coordinates:\n`;
      output += `  Start X,Y: ${info.lastMousePos ? `${info.lastMousePos.x}, ${info.lastMousePos.y}` : 'null'} (${info.startSource || 'unknown'})\n`;
      output += `  End X,Y: ${info.currentMousePos ? `${info.currentMousePos.x}, ${info.currentMousePos.y}` : 'null'} (${info.endSource || 'unknown'})\n`;
      
      output += `\nMetrics:\n`;
      output += `  Ratio: ${info.ratio.toFixed(3)} (threshold: ${info.threshold})\n`;
      output += `  Cell Type: ${info.isDiagonalCell ? 'Diagonal' : info.isOrthogonalCell ? 'Orthogonal' : '-'}\n`;
      output += `  Movement: ${info.movementDirection === 'diagonal' ? 'Diagonal' : info.movementDirection === 'horizontal' ? 'Horizontal' : 'Vertical'}\n`;
      
      if (info.wasPending) {
        output += `  Was Delayed: YES (120ms)\n`;
      }
      
      output += `\n`;
      
      return output;
    }).join('\n');
    
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const renderTrajectoryLine = (info: DebugInfo, index: number) => {
    if (!info.lastMousePos || !info.currentMousePos) return null;
    
    const fromX = info.lastMousePos.x;
    const fromY = info.lastMousePos.y;
    const toX = info.currentMousePos.x;
    const toY = info.currentMousePos.y;
    
    const color = info.isMovingDiagonally ? 'yellow' : 'lime';
    const opacity = index === 0 ? 0.9 : index === 1 ? 0.5 : 0.25;
    
    return (
      <g key={`trajectory-${index}`}>
        <line
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          stroke={color}
          strokeWidth="3"
          markerEnd={`url(#arrowhead-${color})`}
          opacity={opacity}
        />
        <circle
          cx={fromX}
          cy={fromY}
          r="6"
          fill="red"
          stroke="white"
          strokeWidth="2"
          opacity={opacity}
        />
        <circle
          cx={toX}
          cy={toY}
          r="6"
          fill="blue"
          stroke="white"
          strokeWidth="2"
          opacity={opacity}
        />
      </g>
    );
  };

  const renderMiniGrid = (info: DebugInfo) => {
    if (!info.fromCell || !info.toCell) return null;
    
    const fromRow = info.fromCell.row;
    const fromCol = info.fromCell.col;
    const toRow = info.toCell.row;
    const toCol = info.toCell.col;
    
    const minRow = Math.max(0, Math.min(fromRow, toRow) - 1);
    const maxRow = Math.min(boardSize - 1, Math.max(fromRow, toRow) + 1);
    const minCol = Math.max(0, Math.min(fromCol, toCol) - 1);
    const maxCol = Math.min(boardSize - 1, Math.max(fromCol, toCol) + 1);
    
    const gridRows: JSX.Element[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      const cells: JSX.Element[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const isFrom = row === fromRow && col === fromCol;
        const isTo = row === toRow && col === toCol;
        const letter = board[row][col];
        
        let cellClass = 'debug-grid-cell';
        if (isFrom) cellClass = 'debug-grid-cell debug-grid-cell-from';
        else if (isTo) cellClass = 'debug-grid-cell debug-grid-cell-to';
        
        cells.push(
          <div key={`${row}-${col}`} className={cellClass}>
            {letter}
          </div>
        );
      }
      gridRows.push(
        <div key={row} className="debug-grid-row">
          {cells}
        </div>
      );
    }
    
    return (
      <div className="debug-mini-grid">
        <div className="debug-grid-label">Board Position</div>
        <div className="debug-grid-rows">
          {gridRows}
        </div>
        <div className="debug-grid-legend">
          <div className="debug-legend-item">
            <div className="debug-legend-box debug-legend-box-from"></div>
            <span className="debug-legend-text">From</span>
          </div>
          <div className="debug-legend-item">
            <div className="debug-legend-box debug-legend-box-to"></div>
            <span className="debug-legend-text">To</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPathInfo = (info: DebugInfo) => {
    if (!info.pathBeforeMove && !info.pathAfterMove && !info.toCell) return null;
    
    const pathBefore = info.pathBeforeMove || '';
    const pathAfter = info.pathAfterMove || pathBefore;
    const actionLetter = info.toCell?.letter || '';
    
    let actionColorClass = '';
    let actionSymbol = '?';
    
    if (info.pathAction === 'added') {
      actionColorClass = 'debug-path-action-added';
      actionSymbol = '+';
    } else if (info.pathAction === 'skipped') {
      actionColorClass = 'debug-path-action-skipped';
      actionSymbol = '⊘';
    } else if (info.pathAction === 'backtracked') {
      actionColorClass = 'debug-path-action-backtracked';
      actionSymbol = '←';
    } else if (info.pathAction === 'pending') {
      actionColorClass = 'debug-path-action-pending';
      actionSymbol = '⏳';
    }
    
    return (
      <div className="debug-path-info">
        <div className="debug-path-label">Word Path:</div>
        <div className="debug-path-value">
          <span className="debug-path-text">
            {pathBefore || '(empty)'}
          </span>
          {pathAfter !== pathBefore && (
            <>
              <span className="debug-path-arrow">→</span>
              <span className="debug-path-text">
                {pathAfter}
              </span>
            </>
          )}
        </div>
        <div className="debug-path-action-row">
          <span className="debug-path-label">Action:</span>
          <span className={`debug-path-action ${actionColorClass}`}>
            {actionSymbol} {actionLetter}
          </span>
        </div>
      </div>
    );
  };

  const renderMoveInfo = (info: DebugInfo, index: number, label: string) => (
    <div key={index} className="debug-move-section">
      <div className="debug-move-label">{label}</div>
      
      {renderMiniGrid(info)}
      {renderPathInfo(info)}
      
      <div className="debug-metrics">
        <div className="debug-metric-row-start">
          <span className="debug-metric-label">Start X,Y:</span>
          <div className="debug-metric-value">
            <div className="debug-metric-value-bold">
              {info.lastMousePos ? `${info.lastMousePos.x}, ${info.lastMousePos.y}` : 'null'}
            </div>
            <div className="debug-metric-source">
              {info.startSource || 'unknown'}
            </div>
          </div>
        </div>
        
        <div className="debug-metric-row-start">
          <span className="debug-metric-label">End X,Y:</span>
          <div className="debug-metric-value">
            <div className="debug-metric-value-bold">
              {info.currentMousePos ? `${info.currentMousePos.x}, ${info.currentMousePos.y}` : 'null'}
            </div>
            <div className="debug-metric-source">
              {info.endSource || 'unknown'}
            </div>
          </div>
        </div>
        
        <div className="debug-metric-row">
          <span className="debug-metric-label">Ratio:</span>
          <span className={`debug-metric-value-bold ${info.ratio > info.threshold ? 'debug-metric-ratio-high' : 'debug-metric-ratio-low'}`}>
            {info.ratio.toFixed(3)}
          </span>
        </div>
        
        <div className="debug-metric-row">
          <span className="debug-metric-label">Cell Type:</span>
          <span className="debug-metric-value-bold">
            {info.isDiagonalCell ? '⬈ Diagonal' : info.isOrthogonalCell ? '→ Orthogonal' : '-'}
          </span>
        </div>
        
        <div className="debug-metric-row">
          <span className="debug-metric-label">Movement:</span>
          <span className={`debug-metric-value-bold ${
            info.movementDirection === 'diagonal' ? 'debug-metric-diagonal' : 
            info.movementDirection === 'horizontal' ? 'debug-metric-horizontal' : 'debug-metric-vertical'
          }`}>
            {info.movementDirection === 'diagonal' ? '⬈ Diagonal' : 
             info.movementDirection === 'horizontal' ? '↔ Horizontal' : '↕ Vertical'}
          </span>
        </div>
        
        {info.wasPending && (
          <div className="debug-metric-row">
            <span className="debug-metric-label">Was Delayed:</span>
            <span className="debug-metric-value-bold debug-metric-delayed">⏱️ YES (120ms)</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <svg className="debug-overlay-svg">
        <defs>
          <marker
            id="arrowhead-lime"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="lime" />
          </marker>
          <marker
            id="arrowhead-yellow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="yellow" />
          </marker>
        </defs>
        {debugHistory.slice(-3).reverse().map((info, index) => 
          renderTrajectoryLine(info, index)
        )}
      </svg>

      <div className="debug-panel">
        <div className="debug-panel-header">
          <span>🔍 Drag Debug Info</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={copyDebugInfo}
              className="debug-copy-button"
              title="Copy debug info to clipboard"
            >
              📋 Copy
            </button>
            <span className="debug-threshold">Threshold: {debugHistory[0]?.threshold}</span>
          </div>
        </div>
        
        {debugHistory.length > 0 && debugHistory.slice(-3).reverse().map((info, index) => {
          let label = '📍 Current Move';
          if (index === 1) label = '📜 Previous Move';
          else if (index === 2) label = '📜 2 Moves Ago';
          return renderMoveInfo(info, index, label);
        })}
        
        {renderCoordLog()}
      </div>
    </>
  );
};
