import { useState, useEffect, useRef } from 'react';
import { GameState, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { StartPage } from './pages/StartPage';
import { ConfigPage } from './pages/ConfigPage';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import { FeedbackType } from './components/Board';
import './App.css';

function App() {
  const { game, words, results, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [dwellTime, setDwellTime] = useState(30);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const timeRemaining = useTimer(game, fetchGameState);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setDebugMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSinglePlayer = async () => {
    await createGame();
  };

  const handleHostGame = () => {
    // Placeholder for multiplayer functionality
    console.log('Host Game clicked - feature not yet implemented');
  };

  const handleBackToStart = async () => {
    await cancelGame();
  };

  const handleStartGame = async (boardSize: number, timeLimit: number, minWordLength: number) => {
    await startGame(timeLimit, boardSize, minWordLength);
    setFeedback(null);
  };

  const handleCancelGame = async () => {
    await cancelGame();
  };

  const handleTitleClick = () => {
    if (longPressTriggered.current) return;
    const isOnStartScreen = game === null;
    if (isOnStartScreen) return;
    setShowHomeConfirm(true);
  };

  const handleTitlePointerDown = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setDebugMode(prev => !prev);
    }, 800);
  };

  const handleTitlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleConfirmHome = async () => {
    setShowHomeConfirm(false);
    await cancelGame();
  };

  const handleEndGame = async () => {
    await endGame();
  };

  const handlePlayAgain = async () => {
    await createGame();
  };

  const handleSubmitWord = async (path: Position[]) => {
    const result = await submitWord(path);
    
    let feedbackType: FeedbackType;
    if (result.valid) {
      feedbackType = 'valid';
      fetchGameState();
    } else if (result.reason === 'repeat') {
      feedbackType = 'duplicate';
    } else {
      feedbackType = 'invalid';
    }
    
    setFeedback({ type: feedbackType, path });
    setTimeout(() => setFeedback(null), 200);
  };

  const renderPage = () => {
    const status = game?.status ?? null;

    switch (status) {
      case null:  // No game created yet - show start screen
        return (
          <StartPage 
            onSinglePlayer={handleSinglePlayer}
            onHostGame={handleHostGame}
          />
        );

      case GameState.Config:  // Game created, in config phase
        return (
          <ConfigPage 
            onStartGame={handleStartGame}
            onBack={handleBackToStart}
          />
        );

      case GameState.InProgress:  // Game is active
        return (
          <GamePage 
            game={game!}
            words={words}
            timeRemaining={timeRemaining}
            feedback={feedback}
            onSubmitWord={handleSubmitWord}
            onCancelGame={handleCancelGame}
            onEndGame={handleEndGame}
            debugMode={debugMode}
            dwellTime={dwellTime}
            onDwellTimeChange={setDwellTime}
          />
        );

      case GameState.Finished:
        return <ResultsPage results={results} onPlayAgain={handlePlayAgain} />;

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <h1 
        onClick={handleTitleClick}
        onPointerDown={handleTitlePointerDown}
        onPointerUp={handleTitlePointerUp}
        onPointerLeave={handleTitlePointerUp}
        className={`app-title ${debugMode ? 'debug-active' : ''}`}
      >
        Froggle
      </h1>
      {showHomeConfirm && (
        <div className="confirm-overlay" onClick={() => setShowHomeConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <p>Return to the home screen?</p>
            <div className="confirm-buttons">
              <button className="confirm-yes" onClick={handleConfirmHome}>Yes</button>
              <button className="confirm-no" onClick={() => setShowHomeConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {renderPage()}
    </div>
  );
}

export default App;
