import type { Position } from 'models';
import { useCallback, useRef, useState } from 'react';
import type { FeedbackType } from '../components/Board';
import { extendPath, hitsTile } from '../path';

interface BoardInteractionOptions {
  onSubmitWord: (path: Position[]) => void;
  feedback: { type: FeedbackType; path: Position[]; } | null;
  onCellSelected?: () => void;
  proximityRadius?: number;
}
export interface CellProximityData { proximity: number; angle: number; }
export type CellProximityMap = Map<string, CellProximityData>;

export function useBoardInteraction({ onSubmitWord, feedback, onCellSelected, proximityRadius = 0.7 }: BoardInteractionOptions) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<{ pointer: number; path: Position[]; } | null>(null);
  const [currentPath, setPath] = useState<Position[]>([]);
  const [proximity, setProximity] = useState<CellProximityMap>(new Map());
  const tiles = () => boardRef.current?.querySelectorAll<HTMLElement>('[data-row][data-col]');

  const updateProximity = useCallback((x: number, y: number) => {
    const next = new Map<string, CellProximityData>();
    for (const tile of tiles() ?? []) {
      const rect = tile.getBoundingClientRect();
      const dx = x - rect.left - rect.width / 2;
      const dy = y - rect.top - rect.height / 2;
      const strength = Math.max(0, 1 - Math.hypot(dx, dy) / (rect.width * proximityRadius));
      if (strength) next.set(`${tile.dataset.row},${tile.dataset.col}`, { proximity: strength, angle: Math.atan2(dy, dx) * 180 / Math.PI });
    }
    setProximity(next);
  }, [proximityRadius]);

  const cancelGesture = () => {
    gesture.current = null;
    setPath([]);
    setProximity(new Map());
  };
  const handleCellPointerDown = (row: number, col: number, event: React.PointerEvent<HTMLDivElement>) => {
    if (!hitsTile(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())) return;
    const path = [{ row, col }];
    gesture.current = { pointer: event.pointerId, path };
    setPath(path);
    onCellSelected?.();
    updateProximity(event.clientX, event.clientY);
  };
  const handleBoardPointerMove = (event: React.PointerEvent) => {
    const active = gesture.current;
    if (!active || active.pointer !== event.pointerId) return;
    updateProximity(event.clientX, event.clientY);
    for (const tile of tiles() ?? []) {
      if (!hitsTile(event.clientX, event.clientY, tile.getBoundingClientRect())) continue;
      const cell = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
      const path = extendPath(active.path, cell);
      if (path !== active.path) {
        active.path = path;
        setPath(path);
        onCellSelected?.();
      }
      break;
    }
  };
  const handleBoardPointerUp = () => {
    const active = gesture.current;
    gesture.current = null;
    setProximity(new Map());
    if (active?.path.length) onSubmitWord(active.path);
  };
  const clearPath = useCallback(() => setPath([]), []);
  return {
    boardRef, currentPath, clearPath,
    handleCellPointerDown, handleBoardPointerMove, handleBoardPointerUp,
    handleBoardPointerLeave: cancelGesture,
    isInCurrentPath: (row: number, col: number) => currentPath.some(cell => cell.row === row && cell.col === col),
    isInFeedbackPath: (row: number, col: number): FeedbackType => feedback?.path.some(cell => cell.row === row && cell.col === col) ? feedback.type : null,
    getCellProximity: (row: number, col: number) => proximity.get(`${row},${col}`) ?? { proximity: 0, angle: 0 },
  };
}
