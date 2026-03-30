import { useState, useRef } from 'react';

type MultiplayerPanel = null | 'host' | 'join';

interface StartPageProps {
  onSinglePlayer: () => void;
  onHostGame: (name: string) => void;
  onJoinGame: (code: string, name: string) => void;
  error?: string | null;
  onClearError?: () => void;
}

export const StartPage = ({ onSinglePlayer, onHostGame, onJoinGame, error, onClearError }: StartPageProps) => {
  const [panel, setPanel] = useState<MultiplayerPanel>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const setPanel2 = (p: MultiplayerPanel) => {
    setPanel(p);
    onClearError?.();
  };

  const handleHost = () => {
    const trimmed = name.trim() || 'Player';
    onHostGame(trimmed);
  };

  const handleJoin = () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim() || 'Player';
    if (trimmedCode.length < 4) {
      codeRef.current?.focus();
      return;
    }
    onJoinGame(trimmedCode, trimmedName);
  };

  return (
    <div className="start-screen">
      <div className="menu-buttons">
        <button onClick={onSinglePlayer} className="menu-button">
          Play
        </button>
        <button
          onClick={() => setPanel2(panel === 'host' ? null : 'host')}
          className={`menu-button ${panel === 'host' ? 'menu-button-active' : ''}`}
        >
          Host Game
        </button>
        <button
          onClick={() => setPanel2(panel === 'join' ? null : 'join')}
          className={`menu-button ${panel === 'join' ? 'menu-button-active' : ''}`}
        >
          Join Game
        </button>
      </div>

      {panel === 'host' && (
        <div className="mp-panel">
          <input
            className="mp-input"
            placeholder="Your name"
            value={name}
            maxLength={20}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleHost()}
            autoFocus
          />
          <button className="start-button" onClick={handleHost}>
            Create Room
          </button>
        </div>
      )}

      {panel === 'join' && (
        <div className="mp-panel">
          <input
            ref={codeRef}
            className="mp-input mp-code-input"
            placeholder="Room code (e.g. AB3X)"
            value={code}
            maxLength={4}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <input
            className="mp-input"
            placeholder="Your name"
            value={name}
            maxLength={20}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button className="start-button" onClick={handleJoin}>
            Join Room
          </button>
        </div>
      )}

      {error && <div className="mp-error">{error}</div>}
    </div>
  );
};
