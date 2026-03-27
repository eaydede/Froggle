import { useState, useRef } from 'react';
import { GameState, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useFeedbackSounds } from './hooks/useFeedbackSounds';
import { StartPage } from './pages/StartPage';
import { ConfigPage } from './pages/ConfigPage';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import { FeedbackType } from './components/Board';
import './App.css';

const loadMuted = (): boolean => {
  try {
    return localStorage.getItem('froggle-muted') === 'true';
  } catch { return false; }
};

function App() {
  const { game, words, results, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [boardStyle, setBoardStyle] = useState({ base: 1, hover: 0, press: 3, sound: 0, validSound: 0, invalidSound: 0, duplicateSound: 2, colorWash: 35, preact: 1, preactRadius: 130, preactIntensity: 100, validAnim: 3 });
  const [showBoardStylePicker, setShowBoardStylePicker] = useState(false);
  const [muted, setMuted] = useState(loadMuted);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem('froggle-muted', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const timeRemaining = useTimer(game, fetchGameState);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(boardStyle.validSound, boardStyle.invalidSound, boardStyle.duplicateSound);

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
      setShowBoardStylePicker(prev => !prev);
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
      if (!muted) playValid();
      fetchGameState();
    } else if (result.reason === 'repeat') {
      feedbackType = 'duplicate';
      if (!muted) playDuplicate();
    } else {
      feedbackType = 'invalid';
      if (!muted) playInvalid();
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
            boardStyle={boardStyle}
            onBoardStyleChange={setBoardStyle}
            showBoardStylePicker={showBoardStylePicker}
            muted={muted}
            onToggleMute={toggleMute}
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
        className="app-title"
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
