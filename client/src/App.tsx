import { useState, useRef, useEffect } from 'react';
import { GameState, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useFeedbackSounds } from './hooks/useFeedbackSounds';
import { LandingPage } from './landing';
import type { DailyResults } from './landing';
import { GameConfigPage } from './game-config';
import type { GameConfig } from './game-config';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import { FeedbackType } from './components/Board';
import { decodeSeedCode } from 'models/seedCode';
import { getDailyInfo, getDailyDatePST } from './utils/daily';
import { recordDailyResult, loadDailyResult, hasPlayedDaily, clearDailyResult } from './utils/dailyStorage';
import { fetchDailyBoard } from './api/gameApi';
import './App.css';
import './tailwind.css';

const loadMuted = (): boolean => {
  try {
    return localStorage.getItem('froggle-muted') === 'true';
  } catch { return false; }
};

function App() {
  const { game, words, results, gameSeed, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);

  const [muted, setMuted] = useState(loadMuted);
  const [sharedSeed, setSharedSeed] = useState<{ boardSize: number; seed: number } | null>(null);
  const [dailyInfo, setDailyInfo] = useState<{ date: string; number: number; seed: number } | null>(null);
  const [viewingDailyResults, setViewingDailyResults] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem('froggle-muted', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const timeRemaining = useTimer(game, fetchGameState);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  const handleSinglePlayer = async () => {
    setDailyInfo(null);
    setViewingDailyResults(false);
    await createGame();
  };

  const handleDaily = async () => {
    const info = getDailyInfo();
    setDailyInfo({ date: info.date, number: info.number, seed: info.seed });
    setViewingDailyResults(false);
    await createGame();
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
        const info = getDailyInfo();
        const todayDate = getDailyDatePST();
        const todayResult = hasPlayedDaily(todayDate) ? loadDailyResult(todayDate) : null;

        let dailyResultsData: DailyResults | null = null;
        if (todayResult) {
          const longest = todayResult.foundWords.reduce(
            (best, w) => w.word.length > best.length ? w.word : best, ''
          );
          dailyResultsData = {
            words: todayResult.wordCount,
            points: todayResult.score,
            longestWord: longest,
          };
        }

        return (
          <div className="flex flex-1 items-center justify-center">
            <LandingPage
              dailyConfig={{
                puzzleNumber: info.number,
                boardSize: info.boardSize,
                timer: info.timeLimit,
                minWordLength: info.minWordLength,
              }}
              dailyResults={dailyResultsData}
              onDailyClick={todayResult ? handleDailyResults : handleDaily}
              onFreePlayClick={handleSinglePlayer}
            />
          </div>
        );

      case GameState.Config: {  // Game created, in config phase
        if (dailyLoading) return null;
        const isDaily = dailyInfo !== null;
        const dailyDefaults = isDaily ? {
          boardSize: getDailyInfo().boardSize as 4 | 5 | 6,
          timer: getDailyInfo().timeLimit as 60 | 120 | -1,
          minWordLength: getDailyInfo().minWordLength as 3 | 4 | 5,
        } : undefined;

        const handleDailyStart = async () => {
          const info = getDailyInfo();
          setDailyLoading(true);
          await startGame(info.timeLimit, info.boardSize, info.minWordLength, undefined, info.seed);
          setDailyLoading(false);
          setFeedback(null);
        };

        return (
          <div className="flex flex-1 items-center justify-center">
            <GameConfigPage
              title={isDaily ? 'Daily Puzzle' : 'Free Play'}
              subtitle="Choose your settings"
              card={false}
              onBack={handleBackToStart}
              onStart={isDaily
                ? () => handleDailyStart()
                : (config: GameConfig) => handleStartGame(config.boardSize, config.timer, config.minWordLength)
              }
              disabled={isDaily}
              defaultValues={dailyDefaults}
            />
          </div>
        );
      }

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

  const isLandingPage = (game?.status ?? null) === null && !viewingDailyResults;
  const isConfigPage = game?.status === GameState.Config;
  const hideAppTitle = isLandingPage || isConfigPage;

  return (
    <div className="app">
      {!hideAppTitle && (
        <h1 
          onClick={handleTitleClick}
          className="app-title"
        >
          Froggle
        </h1>
      )}
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
