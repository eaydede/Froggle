import { ActionButton } from '../../../shared/results/components/ActionButton';

// Bottom-of-page action pair on a gauntlet round-results screen. Left
// side returns the player to wherever they came from (home in mid-play,
// standings if they arrived from the aggregate page). Right side
// advances — to the next round's confirm, the next round's results
// (when viewing from standings), or the aggregate page on the last
// round.
export function GauntletBottomActions({
  isLastRound,
  fromStandings,
  onBack,
  onAdvance,
}: {
  isLastRound: boolean;
  fromStandings: boolean;
  onBack: () => void;
  onAdvance: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ActionButton
        onClick={onBack}
        label={fromStandings ? 'Back' : 'Home'}
        icon={
          fromStandings ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
              <path d="M9 20v-6h6v6" />
            </svg>
          )
        }
      />
      <ActionButton
        onClick={onAdvance}
        label={isLastRound ? 'See standings' : 'Next round'}
        primary
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        }
      />
    </div>
  );
}
