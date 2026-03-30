import { useState } from 'react';
import { RoomPlayerInfo } from 'models';

const BOARD_SIZES = [4, 5, 6];
const TIME_LIMITS = [60, 120, -1];
const MIN_WORD_LENGTHS = [3, 4, 5];

const formatTime = (v: number) => v === -1 ? '∞' : `${v}s`;
const formatBoard = (v: number) => `${v}×${v}`;

interface LobbyPageProps {
  roomCode: string;
  players: RoomPlayerInfo[];
  myId: string;
  isHost: boolean;
  onStartGame: (boardSize: number, durationSeconds: number, minWordLength: number) => void;
  onLeave: () => void;
}

export const LobbyPage = ({ roomCode, players, myId, isHost, onStartGame, onLeave }: LobbyPageProps) => {
  const [boardSize, setBoardSize] = useState(4);
  const [timeLimit, setTimeLimit] = useState(120);
  const [minWordLength, setMinWordLength] = useState(3);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => {
      prompt('Room code:', roomCode);
    });
  };

  const handleStart = () => {
    onStartGame(boardSize, timeLimit === -1 ? 0 : timeLimit, minWordLength);
  };

  return (
    <div className="lobby-page">
      <div className="lobby-code-section">
        <div className="lobby-code-label">Room Code</div>
        <button className="lobby-code" onClick={handleCopyCode} title="Click to copy">
          {roomCode}
          {codeCopied && <span className="lobby-code-copied">Copied!</span>}
        </button>
        <div className="lobby-code-hint">Share this code with friends</div>
      </div>

      <div className="lobby-players">
        <div className="lobby-players-label">Players ({players.length})</div>
        <ul className="lobby-player-list">
          {players.map(p => (
            <li key={p.id} className={`lobby-player-item ${p.id === myId ? 'me' : ''}`}>
              <span className="lobby-player-name">{p.name}</span>
              {p.isHost && <span className="lobby-host-badge">host</span>}
              {p.id === myId && <span className="lobby-you-badge">you</span>}
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="lobby-config">
          <div className="lobby-config-row">
            <span className="lobby-config-label">Board</span>
            <div className="lobby-seg">
              {BOARD_SIZES.map(s => (
                <button
                  key={s}
                  className={`lobby-seg-btn ${boardSize === s ? 'active' : ''}`}
                  onClick={() => setBoardSize(s)}
                >
                  {formatBoard(s)}
                </button>
              ))}
            </div>
          </div>
          <div className="lobby-config-row">
            <span className="lobby-config-label">Time</span>
            <div className="lobby-seg">
              {TIME_LIMITS.map(t => (
                <button
                  key={t}
                  className={`lobby-seg-btn ${timeLimit === t ? 'active' : ''}`}
                  onClick={() => setTimeLimit(t)}
                >
                  {formatTime(t)}
                </button>
              ))}
            </div>
          </div>
          <div className="lobby-config-row">
            <span className="lobby-config-label">Min Letters</span>
            <div className="lobby-seg">
              {MIN_WORD_LENGTHS.map(l => (
                <button
                  key={l}
                  className={`lobby-seg-btn ${minWordLength === l ? 'active' : ''}`}
                  onClick={() => setMinWordLength(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isHost && (
        <div className="lobby-waiting">
          Waiting for host to start…
        </div>
      )}

      <div className="lobby-actions">
        {isHost && (
          <button
            className="start-button"
            onClick={handleStart}
            disabled={players.length < 1}
          >
            Start Game
          </button>
        )}
        <button className="lobby-leave-btn" onClick={onLeave}>
          Leave
        </button>
      </div>
    </div>
  );
};
