import { useState, useRef, useEffect } from 'react';
import { GameState, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useFeedbackSounds } from './hooks/useFeedbackSounds';
import { StartPage } from './pages/StartPage';
import { ConfigPage } from './pages/ConfigPage';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import { FeedbackType } from './components/Board';
import { decodeSeedCode } from 'models/seedCode';
import { getDailyInfo, getDailyDatePST } from './utils/daily';
import { recordDailyResult, loadDailyResult, hasPlayedDaily, clearDailyResult } from './utils/dailyStorage';
import { fetchDailyBoard } from './api/gameApi';
import './App.css';

const loadMuted = (): boolean => {
  try {
    return localStorage.getItem('froggle-muted') === 'true';
  } catch { return false; }
};

function App() {
  const { game, words, results, gameSeed, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [boardStyle, setBoardStyle] = useState({ base: 0, hover: 0, press: 3, sound: 0, validSound: 0, invalidSound: 0, duplicateSound: 2, colorWash: 35, preact: 1, preactRadius: 130, preactIntensity: 100, validAnim: 3 });
  const [showBoardStylePicker, setShowBoardStylePicker] = useState(false);
  const [muted, setMuted] = useState(loadMuted);
  const [sharedSeed, setSharedSeed] = useState<{ boardSize: number; seed: number } | null>(null);
  const [dailyInfo, setDailyInfo] = useState<{ date: string; number: number; seed: number } | null>(null);
  const [viewingDailyResults, setViewingDailyResults] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
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
    setDailyInfo(null);
    setViewingDailyResults(false);
    await createGame();
  };

  const handleDaily = async () => {
    const info = getDailyInfo();
    setDailyInfo({ date: info.date, number: info.number, seed: info.seed });
    setViewingDailyResults(false);
    setDailyLoading(true);
    await createGame();
    await startGame(info.timeLimit, info.boardSize, info.minWordLength, undefined, info.seed);
    setDailyLoading(false);
    setFeedback(null);
  };

  const handleDailyResults = async () => {
    const date = getDailyDatePST();
    const info = getDailyInfo(date);
    const savedResult = loadDailyResult(date);

    if (savedResult) {
      try {
        const { board: expectedBoard } = await fetchDailyBoard(date);
        const savedFlat = savedResult.board.flat().join(',');
        const expectedFlat = expectedBoard.flat().join(',');
        if (savedFlat !== expectedFlat) {
          // Board mismatch — clear invalid result so user can replay
          clearDailyResult(date);
          setDailyInfo({ date: info.date, number: info.number, seed: info.seed });
          setViewingDailyResults(false);
          return;
        }
      } catch {
        // If validation request fails, still show results
      }
    }

    setDailyInfo({ date: info.date, number: info.number, seed: info.seed });
    setViewingDailyResults(true);
  };

  const handleBackToStart = async () => {
    await cancelGame();
  };

  const handleStartGame = async (boardSize: number, timeLimit: number, minWordLength: number) => {
    const seed = sharedSeed?.seed;
    await startGame(timeLimit, boardSize, minWordLength, undefined, seed);
    setFeedback(null);
    setSharedSeed(null);
  };

  const handleCancelGame = async () => {
    await cancelGame();
  };

  const handleTitleClick = () => {
    if (longPressTriggered.current) return;
    if (viewingDailyResults) {
      setViewingDailyResults(false);
      setDailyInfo(null);
      return;
    }
    if (game === null) return;
    if (game.status === GameState.InProgress) {
      setShowHomeConfirm(true);
    } else {
      handleConfirmHome();
    }
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
    setSharedSeed(null);
    setDailyInfo(null);
    setViewingDailyResults(false);
    if (game) await cancelGame();
  };

  const handleEndGame = async () => {
    await endGame();
  };

  // Record daily results when they become available, after validating the board
  useEffect(() => {
    if (!dailyInfo || !results || viewingDailyResults) return;

    const validate = async () => {
      try {
        const { board: expectedBoard } = await fetchDailyBoard(dailyInfo.date);
        const resultsFlat = results.board.flat().join(',');
        const expectedFlat = expectedBoard.flat().join(',');
        if (resultsFlat !== expectedFlat) {
          console.warn('Daily board mismatch — results not recorded');
          return;
        }
      } catch {
        // If validation fails, still record (don't penalize for network issues)
      }
      recordDailyResult(
        dailyInfo.date,
        dailyInfo.number,
        results.foundWords,
        results.missedWords,
        results.board,
      );
    };
    validate();
  }, [dailyInfo, results, viewingDailyResults]);

  const handlePlayAgain = async () => {
    if (dailyInfo) {
      // Daily: go back to start screen
      setDailyInfo(null);
      setViewingDailyResults(false);
      if (game) await cancelGame();
    } else {
      await createGame();
    }
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
        if (viewingDailyResults && dailyInfo) {
          const savedResult = loadDailyResult(dailyInfo.date);
          if (savedResult) {
            return (
              <ResultsPage
                results={{
                  board: savedResult.board,
                  foundWords: savedResult.foundWords,
                  missedWords: savedResult.missedWords,
                }}
                onPlayAgain={handlePlayAgain}
                game={{
                  board: savedResult.board,
                  startedAt: 0,
                  status: GameState.Finished,
                  config: {
                    durationSeconds: 120,
                    boardSize: 5,
                    minWordLength: 4,
                  },
                }}
                gameSeed={dailyInfo.seed}
                dailyNumber={dailyInfo.number}
              />
            );
          }
        }
        return (
          <StartPage 
            onSinglePlayer={handleSinglePlayer}
            onDaily={handleDaily}
            onDailyResults={handleDailyResults}
          />
        );

      case GameState.Config:  // Game created, in config phase
        if (dailyLoading) return null;
        return (
          <ConfigPage 
            onStartGame={handleStartGame}
            onBack={handleBackToStart}
            sharedSeed={sharedSeed}
            onSeedCode={(decoded) => setSharedSeed(decoded)}
            onClearShared={() => setSharedSeed(null)}
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
        return <ResultsPage results={results} onPlayAgain={handlePlayAgain} game={game!} gameSeed={gameSeed} dailyNumber={dailyInfo?.number} />;

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
