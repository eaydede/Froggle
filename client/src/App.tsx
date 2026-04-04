import { useState, useRef, useEffect } from 'react';
import { GameState, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { useFeedbackSounds } from './pages/game';
import { LandingPage } from './pages/landing';
import type { DailyResults } from './pages/landing';
import { GameConfigPage } from './pages/config';
import type { GameConfig } from './pages/config';
import { GamePage } from './pages/game';
import type { FeedbackType } from './pages/game';
import { ResultsPage } from './pages/results';
import { decodeSeedCode } from 'models/seedCode';
import { recordDailyResult, loadDailyResult, hasPlayedDaily, clearDailyResult } from './shared/utils/dailyStorage';
import { fetchDaily } from './shared/api/gameApi';
import type { DailyInfo } from './shared/api/gameApi';
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

  const [lastConfig, setLastConfig] = useState<GameConfig | null>(null);
  const [boardCode, setBoardCode] = useState('');
  const [muted, setMuted] = useState(loadMuted);
  const [sharedSeed, setSharedSeed] = useState<{ boardSize: number; seed: number } | null>(null);
  const [dailyInfo, setDailyInfo] = useState<DailyInfo | null>(null);
  const [viewingDailyResults, setViewingDailyResults] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [cachedDaily, setCachedDaily] = useState<DailyInfo | null>(null);

  // Fetch today's daily info on mount for the landing page
  useEffect(() => {
    fetchDaily().then(setCachedDaily).catch(() => {});
  }, []);

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
    const info = await fetchDaily();
    setDailyInfo(info);
    setViewingDailyResults(false);
    await createGame();
  };

  const handleDailyResults = async () => {
    const info = await fetchDaily();
    const savedResult = loadDailyResult(info.date);

    if (savedResult) {
      try {
        const savedFlat = savedResult.board.flat().join(',');
        const expectedFlat = info.board.flat().join(',');
        if (savedFlat !== expectedFlat) {
          clearDailyResult(info.date);
          setDailyInfo(info);
          setViewingDailyResults(false);
          return;
        }
      } catch {
        // If validation fails, still show results
      }
    }

    setDailyInfo(info);
    setViewingDailyResults(true);
  };

  const handleBackToStart = async () => {
    await cancelGame();
  };

  const handleCodeChange = (code: string) => {
    setBoardCode(code);
    // Try to decode when we have a full code (XXXX-XXXX-XXXX = 14 chars)
    if (code.length === 14) {
      const decoded = decodeSeedCode(code);
      if (decoded) {
        setSharedSeed(decoded);
      } else {
        setSharedSeed(null);
      }
    } else {
      setSharedSeed(null);
    }
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

    const resultsFlat = results.board.flat().join(',');
    const expectedFlat = dailyInfo.board.flat().join(',');
    if (resultsFlat !== expectedFlat) {
      console.warn('Daily board mismatch — results not recorded');
      return;
    }

    recordDailyResult(
      dailyInfo.date,
      dailyInfo.number,
      results.foundWords,
      results.missedWords,
      results.board,
    );
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
        if (!cachedDaily) {
          return (
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-[400px] text-center">
                <h1 className="text-[1.35rem] tracking-[-0.025em]" style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 900 }}>
                  Froggle
                </h1>
              </div>
            </div>
          );
        }

        const todayResult = hasPlayedDaily(cachedDaily.date) ? loadDailyResult(cachedDaily.date) : null;

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
                puzzleNumber: cachedDaily.number,
                boardSize: cachedDaily.config.boardSize,
                timer: cachedDaily.config.timeLimit,
                minWordLength: cachedDaily.config.minWordLength,
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
          boardSize: dailyInfo.config.boardSize as 4 | 5 | 6,
          timer: dailyInfo.config.timeLimit as 60 | 120 | -1,
          minWordLength: dailyInfo.config.minWordLength as 3 | 4 | 5,
        } : undefined;

        const handleDailyStart = async () => {
          if (!dailyInfo) return;
          setDailyLoading(true);
          await startGame(dailyInfo.config.timeLimit, dailyInfo.config.boardSize, dailyInfo.config.minWordLength, undefined, dailyInfo.seed);
          setDailyLoading(false);
          setFeedback(null);
        };

        return (
          <div className="flex flex-1 items-center justify-center">
            <GameConfigPage
              title={isDaily ? 'Daily Puzzle' : 'Free Play'}
              subtitle="Choose your settings"
              card={false}
              onBack={() => { setBoardCode(''); setSharedSeed(null); handleBackToStart(); }}
              onStart={isDaily
                ? () => handleDailyStart()
                : (config: GameConfig) => {
                    setLastConfig(config);
                    // Use decoded board size if a valid code was entered
                    const effectiveBoardSize = sharedSeed ? sharedSeed.boardSize : config.boardSize;
                    handleStartGame(effectiveBoardSize, config.timer, config.minWordLength);
                    setBoardCode('');
                  }
              }
              disabled={isDaily}
              defaultValues={isDaily ? dailyDefaults : lastConfig ?? undefined}
              code={isDaily ? undefined : boardCode}
              onCodeChange={isDaily ? undefined : handleCodeChange}
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
            dailyNumber={dailyInfo?.number}
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
    <div className="max-w-[800px] mx-auto p-5 bg-[#FAFAF8] h-dvh box-border overflow-y-auto flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
      {!hideAppTitle && (
        <h1
          onClick={handleTitleClick}
          className="text-center text-[1.35rem] tracking-[-0.025em] m-0 mb-2.5 cursor-pointer select-none transition-all duration-200 hover:scale-105"
          style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 900 }}
        >
          Froggle
        </h1>
      )}
      {showHomeConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
          onClick={() => setShowHomeConfirm(false)}
        >
          <div
            className="bg-white rounded-xl py-6 px-8 shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-center max-w-[300px]"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base text-[var(--text)] m-0 mb-5">Return to the home screen?</p>
            <div className="flex gap-3 justify-center">
              <button
                className="py-2 px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-none rounded-lg cursor-pointer text-sm transition-colors duration-200"
                style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}
                onClick={handleConfirmHome}
              >
                Yes
              </button>
              <button
                className="py-2 px-6 bg-[var(--track)] hover:bg-[#ddd] text-[var(--text)] border-none rounded-lg cursor-pointer text-sm transition-colors duration-200"
                style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}
                onClick={() => setShowHomeConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {renderPage()}
    </div>
  );
}

export default App;
