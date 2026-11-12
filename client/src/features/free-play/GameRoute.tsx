import { GameState } from 'models';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GamePage } from '../../gameplay/GamePage';
import { usePreferences } from '../preferences/Preferences';
import { useTimedDaily } from '../timed-daily/TimedDaily';
import { useFreePlay } from './FreePlay';

export function GameRoute() {
  const freePlay = useFreePlay();
  const daily = useTimedDaily();
  const { muted, toggleMute } = usePreferences();
  const navigate = useNavigate();
  const navigating = useRef(false);
  const isDaily = !!daily.selectedPuzzle || (!freePlay.game && !!daily.run);
  const game = isDaily ? daily.game : freePlay.game;
  const ready = daily.ready && freePlay.ready;
  const finished = isDaily ? !!daily.run?.ended_at : !!freePlay.results;

  useEffect(() => {
    if (!game && ready) navigate('/');
    if (game?.status === GameState.Finished && finished && !navigating.current) {
      navigating.current = true;
      navigate(isDaily ? '/daily/results' : '/results');
    }
  }, [game, ready, finished, isDaily, navigate]);
  if (!game || game.status !== GameState.InProgress) return null;

  const finish = async () => {
    navigating.current = true;
    if (isDaily) await daily.endRun();
    else await freePlay.endGame();
    navigate(isDaily ? '/daily/results' : '/results');
  };
  return <GamePage
    game={game}
    words={isDaily ? [] : freePlay.words}
    timeRemaining={isDaily ? daily.timeRemaining : freePlay.timeRemaining}
    feedback={isDaily ? daily.feedback : freePlay.feedback}
    onSubmitWord={isDaily ? daily.submitWord : freePlay.submitWord}
    onCancelGame={isDaily ? finish : () => { void freePlay.cancelGame(); navigate('/'); }}
    onEndGame={finish}
    muted={muted}
    onToggleMute={toggleMute}
    dailyNumber={isDaily ? (daily.selectedPuzzle ?? daily.puzzle)?.number : undefined}
  />;
}
