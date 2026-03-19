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
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="font-bold mb-2 text-sm text-purple-400">📍 Coordinate Log</div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {coordLog.slice(-10).map((entry, index) => (
            <div key={index} className="text-[9px] font-mono bg-gray-800 p-1 rounded">
              <div className="flex justify-between">
                <span className="text-gray-400">X,Y:</span>
                <span className="font-bold text-white">{entry.x.toFixed(1)}, {entry.y.toFixed(1)}</span>
              </div>
              <div className="text-gray-500 truncate" title={entry.source}>
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
    // Fade opacity for older moves
    const opacity = index === 0 ? 0.9 : index === 1 ? 0.5 : 0.25;
    
    return (
      <g key={`trajectory-${index}`}>
        {/* Trajectory line */}
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
        {/* Starting point (exit from previous cell) */}
        <circle
          cx={fromX}
          cy={fromY}
          r="6"
          fill="red"
          stroke="white"
          strokeWidth="2"
          opacity={opacity}
        />
        {/* Ending point (entry to current cell) */}
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
    
    // Determine grid bounds to show (min 3x3 area around the cells)
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
        
        let cellClass = 'w-6 h-6 flex items-center justify-center border border-gray-400 text-[10px] font-semibold';
        let bgClass = 'bg-gray-200 text-gray-400';
        
        if (isFrom) {
          cellClass = 'w-8 h-8 flex items-center justify-center border-2 border-blue-500 text-sm font-bold shadow-lg';
          bgClass = 'bg-blue-100 text-blue-700';
        } else if (isTo) {
          cellClass = 'w-8 h-8 flex items-center justify-center border-2 border-red-500 text-sm font-bold shadow-lg';
          bgClass = 'bg-red-100 text-red-700';
        }
        
        cells.push(
          <div key={`${row}-${col}`} className={`${cellClass} ${bgClass} rounded`}>
            {letter}
          </div>
        );
      }
      gridRows.push(
        <div key={row} className="flex gap-0.5 items-center justify-center">
          {cells}
        </div>
      );
    }
    
    return (
      <div className="mb-3 p-2 bg-gray-800 rounded">
        <div className="text-[8px] text-gray-400 mb-1 text-center">Board Position</div>
        <div className="flex flex-col gap-0.5 items-center">
          {gridRows}
        </div>
        <div className="flex justify-center gap-3 mt-2 text-[9px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-500 rounded"></div>
            <span className="text-gray-400">From</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-500 rounded"></div>
            <span className="text-gray-400">To</span>
          </div>
        </div>
      </div>
    );
  };

  const getPathActionInfo = (action?: string) => {
    switch (action) {
      case 'added':
        return { text: '➕ ADDED', color: 'text-green-400' };
      case 'skipped':
        return { text: '⏭️ SKIPPED', color: 'text-gray-400' };
      case 'backtracked':
        return { text: '⬅️ BACKTRACKED', color: 'text-blue-400' };
      case 'pending':
        return { text: '⏳ PENDING', color: 'text-orange-400' };
      default:
        return { text: '❓ UNKNOWN', color: 'text-gray-500' };
    }
  };

  const renderPathInfo = (info: DebugInfo) => {
    if (!info.pathBeforeMove && !info.pathAfterMove && !info.toCell) return null;
    
    const pathBefore = info.pathBeforeMove || '';
    const pathAfter = info.pathAfterMove || pathBefore;
    const actionLetter = info.toCell?.letter || '';
    
    let actionColor = 'text-gray-400';
    let actionSymbol = '?';
    
    if (info.pathAction === 'added') {
      actionColor = 'text-green-400';
      actionSymbol = '+';
    } else if (info.pathAction === 'skipped') {
      actionColor = 'text-gray-500';
      actionSymbol = '⊘';
    } else if (info.pathAction === 'backtracked') {
      actionColor = 'text-blue-400';
      actionSymbol = '←';
    } else if (info.pathAction === 'pending') {
      actionColor = 'text-orange-400';
      actionSymbol = '⏳';
    }
    
    return (
      <div className="mb-2 p-2 bg-gray-800 rounded text-[10px]">
        <div className="text-gray-400 mb-1">Word Path:</div>
        <div className="flex items-center gap-1">
          <span className="font-mono font-bold text-white">
            {pathBefore || '(empty)'}
          </span>
          {pathAfter !== pathBefore && (
            <>
              <span className="text-gray-500">→</span>
              <span className="font-mono font-bold text-white">
                {pathAfter}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-400">Action:</span>
          <span className={`font-bold ${actionColor}`}>
            {actionSymbol} {actionLetter}
          </span>
        </div>
      </div>
    );
  };

  const renderMoveInfo = (info: DebugInfo, index: number, label: string) => (
    <div key={index} className="mb-3 pb-3 border-b border-gray-700 last:border-b-0">
      <div className="font-bold mb-2 text-sm text-blue-400">{label}</div>
      
      {/* Mini grid showing board position */}
      {renderMiniGrid(info)}
      
      {/* Path change info */}
      {renderPathInfo(info)}
      
      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <span className="text-gray-400">Start X,Y:</span>
          <div className="text-right">
            <div className="font-bold">
              {info.lastMousePos ? `${info.lastMousePos.x}, ${info.lastMousePos.y}` : 'null'}
            </div>
            <div className="text-[8px] text-gray-500">
              {info.startSource || 'unknown'}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-start">
          <span className="text-gray-400">End X,Y:</span>
          <div className="text-right">
            <div className="font-bold">
              {info.currentMousePos ? `${info.currentMousePos.x}, ${info.currentMousePos.y}` : 'null'}
            </div>
            <div className="text-[8px] text-gray-500">
              {info.endSource || 'unknown'}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Ratio:</span>
          <span className={`font-bold ${info.ratio > info.threshold ? 'text-yellow-400' : 'text-green-400'}`}>
            {info.ratio.toFixed(3)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Cell Type:</span>
          <span className="font-bold text-xs">
            {info.isDiagonalCell ? '⬈ Diagonal' : info.isOrthogonalCell ? '→ Orthogonal' : '-'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Movement:</span>
          <span className={`font-bold text-xs ${
            info.movementDirection === 'diagonal' ? 'text-yellow-400' : 
            info.movementDirection === 'horizontal' ? 'text-green-400' : 'text-blue-400'
          }`}>
            {info.movementDirection === 'diagonal' ? '⬈ Diagonal' : 
             info.movementDirection === 'horizontal' ? '↔ Horizontal' : '↕ Vertical'}
          </span>
        </div>
        
        {info.wasPending && (
          <div className="flex justify-between">
            <span className="text-gray-400">Was Delayed:</span>
            <span className="font-bold text-xs text-orange-400">⏱️ YES (120ms)</span>
          </div>
        )}
      </div>
    </div>
  );

  const boardDimension = boardSize * cellSize;

  return (
    <>
      {/* SVG overlay for trajectory lines */}
      <svg
        className="fixed top-0 left-0 pointer-events-none z-40"
        style={{ width: '100%', height: '100%' }}
      >
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

      {/* Info panel */}
      <div className="fixed top-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg font-mono text-xs z-50 max-w-xs max-h-[90vh] overflow-y-auto">
        <div className="font-bold mb-3 text-sm flex items-center justify-between">
          <span>🔍 Drag Debug Info</span>
          <div className="flex items-center gap-2">
            <button
              onClick={copyDebugInfo}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-[10px] font-bold cursor-pointer"
              title="Copy debug info to clipboard"
            >
              📋 Copy
            </button>
            <span className="text-blue-400">Threshold: {debugHistory[0]?.threshold}</span>
          </div>
        </div>
        
        {debugHistory.length > 0 && debugHistory.slice(-3).reverse().map((info, index) => {
          let label = '📍 Current Move';
          if (index === 1) label = '📜 Previous Move';
          else if (index === 2) label = '📜 2 Moves Ago';
          return renderMoveInfo(info, index, label);
        })}
        
        {/* Coordinate log */}
        {renderCoordLog()}
      </div>
    </>
  );
};
