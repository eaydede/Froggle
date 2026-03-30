import { useState, useRef, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Game, GameState, Position, RoomPlayerInfo, MultiplayerResults, hashWord } from 'models';

export interface MultiplayerState {
  roomCode: string | null;
  myId: string | null;
  isHost: boolean;
  players: RoomPlayerInfo[];
  game: Game | null;
  myWords: string[];
  results: MultiplayerResults | null;
  error: string | null;
}

const INITIAL_STATE: MultiplayerState = {
  roomCode: null,
  myId: null,
  isHost: false,
  players: [],
  game: null,
  myWords: [],
  results: null,
  error: null,
};

export function useMultiplayer() {
  const [state, setState] = useState<MultiplayerState>(INITIAL_STATE);
  const socketRef = useRef<Socket | null>(null);
  const wordHashesRef = useRef<Set<string>>(new Set());
  const saltRef = useRef<string>('');
  const submittedWordsRef = useRef<Set<string>>(new Set());

  // Lazily create/return the socket
  const getSocket = useCallback((): Socket => {
    if (!socketRef.current) {
      socketRef.current = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
      attachListeners(socketRef.current);
    }
    return socketRef.current;
  }, []);

  const attachListeners = (socket: Socket) => {
    socket.on('room:created', ({ code, players, myId }: { code: string; players: RoomPlayerInfo[]; myId: string }) => {
      setState(prev => ({
        ...prev,
        roomCode: code,
        myId,
        isHost: true,
        players,
        error: null,
      }));
    });

    socket.on('room:joined', ({ code, players, myId, game }: { code: string; players: RoomPlayerInfo[]; myId: string; game: Game | null }) => {
      const me = players.find(p => p.id === myId);
      setState(prev => ({
        ...prev,
        roomCode: code,
        myId,
        isHost: me?.isHost ?? false,
        players,
        game,
        error: null,
      }));
    });

    socket.on('room:updated', ({ players }: { players: RoomPlayerInfo[] }) => {
      setState(prev => {
        const me = players.find(p => p.id === prev.myId);
        return { ...prev, players, isHost: me?.isHost ?? prev.isHost };
      });
    });

    socket.on('room:host-changed', ({ myId }: { myId: string }) => {
      setState(prev => ({
        ...prev,
        myId,
        isHost: true,
        players: prev.players.map(p => ({ ...p, isHost: p.id === myId })),
      }));
    });

    socket.on('room:error', ({ message }: { message: string }) => {
      setState(prev => ({ ...prev, error: message }));
    });

    socket.on('game:started', ({ game, wordHashes, salt }: { game: Game; wordHashes: string[]; salt: string }) => {
      wordHashesRef.current = new Set(wordHashes);
      saltRef.current = salt;
      submittedWordsRef.current = new Set();
      setState(prev => ({ ...prev, game, myWords: [], results: null }));
    });

    socket.on('game:word-result', (_result: { valid: boolean; word?: string; reason?: string }) => {
      // Handled via submitWord return value; nothing to do here
    });

    socket.on('game:score-update', ({ players }: { players: RoomPlayerInfo[] }) => {
      setState(prev => ({ ...prev, players }));
    });

    socket.on('game:ended', ({ results }: { results: MultiplayerResults }) => {
      setState(prev => ({
        ...prev,
        game: prev.game ? { ...prev.game, status: GameState.Finished } : null,
        results,
      }));
    });
  };

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const createRoom = useCallback((name: string) => {
    setState(prev => ({ ...prev, error: null }));
    getSocket().emit('room:create', { name });
  }, [getSocket]);

  const joinRoom = useCallback((code: string, name: string) => {
    setState(prev => ({ ...prev, error: null }));
    getSocket().emit('room:join', { code: code.toUpperCase(), name });
  }, [getSocket]);

  const startGame = useCallback((boardSize: number, durationSeconds: number, minWordLength: number) => {
    socketRef.current?.emit('game:start', { boardSize, durationSeconds, minWordLength });
  }, []);

  const validateWordLocally = useCallback((word: string): { valid: boolean; reason?: string } => {
    const upper = word.toUpperCase();
    if (submittedWordsRef.current.has(upper)) return { valid: false, reason: 'repeat' };
    const hash = hashWord(upper, saltRef.current);
    if (!wordHashesRef.current.has(hash)) return { valid: false, reason: 'invalid' };
    return { valid: true };
  }, []);

  const submitWord = useCallback((path: Position[], board: string[][]): { valid: boolean; word?: string; reason?: string } => {
    const word = path.map(p => board[p.row][p.col]).join('').toUpperCase();
    const localResult = validateWordLocally(word);

    if (localResult.valid) {
      submittedWordsRef.current.add(word);
      setState(prev => ({ ...prev, myWords: [...prev.myWords, word] }));
    }

    // Fire-and-forget to server (server validates too but we give instant local feedback)
    socketRef.current?.emit('game:submit', { path });

    return { ...localResult, word };
  }, [validateWordLocally]);

  const endGame = useCallback(() => {
    socketRef.current?.emit('game:end');
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    socketRef.current?.disconnect();
    socketRef.current = null;
    wordHashesRef.current = new Set();
    saltRef.current = '';
    submittedWordsRef.current = new Set();
    setState(INITIAL_STATE);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    endGame,
    leaveRoom,
    clearError,
  };
}
