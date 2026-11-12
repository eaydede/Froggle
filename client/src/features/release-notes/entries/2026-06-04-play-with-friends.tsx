import type { ChangelogEntry } from '../types';

const entry: ChangelogEntry = {
  id: 'play-with-friends-2026-06-04',
  date: '2026-06-04',
  kind: 'major',
  title: 'Play with friends, live',
  body: (
    <>
      <p>
        Free play is now a room. Share the code or link and your friends
        race the <strong>same board</strong> on the same timer, with a live
        scoreboard as everyone plays.
      </p>
      <ul>
        <li>
          <strong>Drop in, drop out</strong> — players can join or leave
          between rounds, and the host kicks off each new board
        </li>
        <li>
          <strong>Public games</strong> — make your room public and others
          can find and join it from the lobby
        </li>
        <li>
          <strong>Still solo by default</strong> — on your own it plays
          exactly like before; it only becomes a lobby once someone joins
        </li>
      </ul>
      <p>
        Round results crown a winner and show just how close it was.
      </p>
    </>
  ),
};

export default entry;
