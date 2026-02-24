import { useState, useEffect } from 'react';
import { Game, GameStatus, Position, Word } from 'models';
import './App.css';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);
  const [pendingCell, setPendingCell] = useState<{ row: number; col: number; timestamp: number } | null>(null);

  useEffect(() => {
    if (game && game.status === GameStatus.InProgress) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - game.startedAt;
        const remaining = Math.max(0, game.durationSeconds * 1000 - elapsed);
        setTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining === 0) {
          clearInterval(interval);
          fetchGameState();
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [game]);

  const startGame = async () => {
    const response = await fetch(`${API_URL}/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds: 180 }),
    });
    const data = await response.json();
    setGame(data.game);
    setWords(data.words);
    setCurrentPath([]);
    setMessage('');
  };

  const fetchGameState = async () => {
    const response = await fetch(`${API_URL}/game/state`);
    const data = await response.json();
    setGame(data.game);
    setWords(data.words);
  };

  const submitWord = async () => {
    if (currentPath.length < 3) {
      setMessage('Word must be at least 3 letters');
      setCurrentPath([]);
      return;
    }

    const response = await fetch(`${API_URL}/game/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath }),
    });
    const result = await response.json();
    
    if (result.valid) {
      setMessage(`✓ ${result.word}`);
      fetchGameState();
    } else {
      setMessage(`✗ ${result.word}: ${result.reason}`);
    }
    
    setCurrentPath([]);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleCellPointerDown = (row: number, col: number, e: React.PointerEvent) => {
    setIsDragging(true);
    setCurrentPath([{ row, col }]);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleCellPointerEnter = (row: number, col: number, e: React.PointerEvent) => {
    if (!isDragging || !game) return;
    
    const lastPos = currentPath[currentPath.length - 1];
    if (!lastPos) return;
    
    // Check if adjacent
    const isAdjacent = Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1;
    if (!isAdjacent) return;
    
    // Check if already in path
    const alreadyInPath = currentPath.some(p => p.row === row && p.col === col);
    if (alreadyInPath) return;
    
    // Determine if this is a diagonal or orthogonal move
    const isDiagonal = Math.abs(lastPos.row - row) === 1 && Math.abs(lastPos.col - col) === 1;
    const isOrthogonal = (lastPos.row === row) || (lastPos.col === col);
    
    // If we have mouse tracking, check movement direction
    if (lastMousePos) {
      const currentMousePos = { x: e.clientX, y: e.clientY };
      const deltaX = currentMousePos.x - lastMousePos.x;
      const deltaY = currentMousePos.y - lastMousePos.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Determine if the cursor is moving diagonally based on movement ratios
      const isMovingDiagonally = Math.min(absDeltaX, absDeltaY) / Math.max(absDeltaX, absDeltaY) > 0.3;
      
      // If moving diagonally but hit an orthogonal cell, delay selection
      if (isMovingDiagonally && isOrthogonal) {
        // Store this as a pending cell with timestamp
        setPendingCell({ row, col, timestamp: Date.now() });
        
        // Set a short timeout to clear the pending cell if we don't move to a diagonal
        setTimeout(() => {
          setPendingCell(prev => {
            // Only clear if it's the same cell and enough time has passed
            if (prev && prev.row === row && prev.col === col && Date.now() - prev.timestamp >= 100) {
              // User stayed on orthogonal cell, select it
              setCurrentPath(path => [...path, { row, col }]);
              setLastMousePos(currentMousePos);
              return null;
            }
            return prev;
          });
        }, 100);
        return;
      }
      
      // If we enter a diagonal cell, clear any pending orthogonal selection
      if (isDiagonal && pendingCell) {
        setPendingCell(null);
      }
    }
    
    // Add the cell to the path
    setCurrentPath([...currentPath, { row, col }]);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    if (isDragging && currentPath.length > 0) {
      submitWord();
    }
    setIsDragging(false);
    setLastMousePos(null);
    setPendingCell(null);
  };

  const isInCurrentPath = (row: number, col: number) => {
    return currentPath.some(p => p.row === row && p.col === col);
  };

  const getCurrentWord = () => {
    if (!game) return '';
    return currentPath.map(pos => game.board[pos.row][pos.col]).join('');
  };

  return (
    <div className="app">
      <h1>Boggle</h1>
      
      {!game || game.status === GameStatus.Finished ? (
        <div className="start-screen">
          <button onClick={startGame} className="start-button">
            {game?.status === GameStatus.Finished ? 'Play Again' : 'Start Game'}
          </button>
          
          {game?.status === GameStatus.Finished && (
            <div className="results">
              <h2>Game Over!</h2>
              <p>Words Found: {words.length}</p>
              <div className="words-list">
                {words.map((w, i) => (
                  <div key={i} className="word-item">{w.word}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="game-screen">
          <div className="game-info">
            <div className="timer">Time: {timeRemaining}s</div>
            <div className="score">Words: {words.length}</div>
          </div>
          
          <div 
            className="board" 
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              setIsDragging(false);
              setLastMousePos(null);
              setPendingCell(null);
            }}
          >
            {game.board.map((row, rowIndex) => (
              <div key={rowIndex} className="board-row">
                {row.map((letter, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`cell ${isInCurrentPath(rowIndex, colIndex) ? 'selected' : ''}`}
                    onPointerDown={(e) => handleCellPointerDown(rowIndex, colIndex, e)}
                    onPointerEnter={(e) => handleCellPointerEnter(rowIndex, colIndex, e)}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="current-word">
            {getCurrentWord() || 'Drag to select letters'}
          </div>
          
          {message && <div className="message">{message}</div>}
          
          <div className="words-found">
            <h3>Words Found ({words.length})</h3>
            <div className="words-list">
              {words.map((w, i) => (
                <div key={i} className="word-item">{w.word}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
