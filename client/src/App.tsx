import { useState, useRef, useEffect } from 'react';
import { GameState, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useMultiplayer } from './hooks/useMultiplayer';
import { useTimer } from './hooks/useTimer';
import { useFeedbackSounds } from './hooks/useFeedbackSounds';
import { StartPage } from './pages/StartPage';
import { ConfigPage } from './pages/ConfigPage';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import { LobbyPage } from './pages/LobbyPage';
import { FeedbackType } from './components/Board';
import { decodeBoard, decodeBoardOnly, parseCode, SharedBoard, SharedBoardOnly } from './utils/boardCode';
import './App.css';

const loadMuted = (): boolean => {
  try {
    return localStorage.getItem('froggle-muted') === 'true';
  } catch { return false; }
};

function App() {
  // ── Single-player state ──────────────────────────────────────────────────
  const { game, words, results, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [boardStyle, setBoardStyle] = useState({ base: 0, hover: 0, press: 3, sound: 0, validSound: 0, invalidSound: 0, duplicateSound: 2, colorWash: 35, preact: 1, preactRadius: 130, preactIntensity: 100, validAnim: 3 });
  const [showBoardStylePicker, setShowBoardStylePicker] = useState(false);
  const [muted, setMuted] = useState(loadMuted);
  const [sharedGame, setSharedGame] = useState<SharedBoard | null>(null);
  const [sharedBoardOnly, setSharedBoardOnly] = useState<SharedBoardOnly | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  // ── Multiplayer state ────────────────────────────────────────────────────
  const mp = useMultiplayer();
  const isMultiplayer = mp.roomCode !== null;

  // ── Shared board URL handling ────────────────────────────────────────────
  useEffect(() => {
    const path = window.location.pathname;

    const gameMatch = path.match(/^\/g\/(.+)$/);
    if (gameMatch) {
      const code = parseCode(gameMatch[1]);
      const decoded = decodeBoard(code);
      if (decoded) {
        setSharedGame(decoded);
        createGame();
      }
      window.history.replaceState({}, '', '/');
      return;
    }

    const boardMatch = path.match(/^\/b\/(.+)$/);
    if (boardMatch) {
      const code = parseCode(boardMatch[1]);
      const decoded = decodeBoardOnly(code);
      if (decoded) {
        setSharedBoardOnly(decoded);
        createGame();
      }
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem('froggle-muted', String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // In multiplayer the server controls the clock; pass a no-op so we don't fire
  // the single-player HTTP fetchGameState when the client-side timer hits 0.
  const timeRemaining = useTimer(isMultiplayer ? mp.game : game, isMultiplayer ? () => {} : fetchGameState);
  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(boardStyle.validSound, boardStyle.invalidSound, boardStyle.duplicateSound);

  // ── Single-player handlers ───────────────────────────────────────────────
  const handleSinglePlayer = async () => {
    await createGame();
  };

  const handleBackToStart = async () => {
    await cancelGame();
  };

  const handleStartGame = async (boardSize: number, timeLimit: number, minWordLength: number) => {
    const predefinedBoard = sharedGame?.board || sharedBoardOnly?.board;
    await startGame(timeLimit, boardSize, minWordLength, predefinedBoard);
    setFeedback(null);
    setSharedGame(null);
    setSharedBoardOnly(null);
  };

  const handleCancelGame = async () => {
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

  // ── Multiplayer handlers ─────────────────────────────────────────────────
  const handleHostGame = (name: string) => {
    mp.createRoom(name);
  };

  const handleJoinGame = (code: string, name: string) => {
    mp.joinRoom(code, name);
  };

  const handleMpStartGame = (boardSize: number, durationSeconds: number, minWordLength: number) => {
    mp.startGame(boardSize, durationSeconds, minWordLength);
  };

  const handleMpSubmitWord = (path: Position[]) => {
    if (!mp.game) return;
    const result = mp.submitWord(path, mp.game.board);

    let feedbackType: FeedbackType;
    if (result.valid) {
      feedbackType = 'valid';
      if (!muted) playValid();
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

  const handleMpEndGame = () => {
    mp.endGame();
  };

  const handleMpPlayAgain = () => {
    mp.leaveRoom();
  };

  // ── Title interaction ────────────────────────────────────────────────────
  const handleTitleClick = () => {
    if (longPressTriggered.current) return;
    const isOnStartScreen = !isMultiplayer && game === null;
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
    if (isMultiplayer) {
      mp.leaveRoom();
    } else {
      setSharedGame(null);
      setSharedBoardOnly(null);
      await cancelGame();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const renderPage = () => {
    // ── Multiplayer flow ──
    if (isMultiplayer) {
      const mpStatus = mp.game?.status ?? null;

      if (mpStatus === null || mpStatus === GameState.Config) {
        return (
          <LobbyPage
            roomCode={mp.roomCode!}
            players={mp.players}
            myId={mp.myId!}
            isHost={mp.isHost}
            onStartGame={handleMpStartGame}
            onLeave={() => mp.leaveRoom()}
          />
        );
      }

      if (mpStatus === GameState.InProgress) {
        return (
          <GamePage
            game={mp.game!}
            words={[]}
            timeRemaining={timeRemaining}
            feedback={feedback}
            onSubmitWord={handleMpSubmitWord}
            onCancelGame={() => mp.leaveRoom()}
            onEndGame={mp.isHost ? handleMpEndGame : () => mp.leaveRoom()}
            boardStyle={boardStyle}
            onBoardStyleChange={setBoardStyle}
            showBoardStylePicker={showBoardStylePicker}
            muted={muted}
            onToggleMute={toggleMute}
            multiplayerPlayers={mp.players}
            myId={mp.myId ?? undefined}
          />
        );
      }

      if (mpStatus === GameState.Finished) {
        return (
          <ResultsPage
            results={null}
            onPlayAgain={handleMpPlayAgain}
            game={mp.game!}
            multiplayerResults={mp.results ?? undefined}
            myId={mp.myId ?? undefined}
          />
        );
      }
    }

    // ── Single-player flow ──
    const status = game?.status ?? null;

    switch (status) {
      case null:
        return (
          <StartPage
            onSinglePlayer={handleSinglePlayer}
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
            error={mp.error}
            onClearError={mp.clearError}
          />
        );

      case GameState.Config:
        return (
          <ConfigPage
            onStartGame={handleStartGame}
            onBack={handleBackToStart}
            sharedGame={sharedGame}
            sharedBoardOnly={sharedBoardOnly}
            onClearShared={() => { setSharedGame(null); setSharedBoardOnly(null); }}
          />
        );

      case GameState.InProgress:
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
        return <ResultsPage results={results} onPlayAgain={handlePlayAgain} game={game!} />;

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
