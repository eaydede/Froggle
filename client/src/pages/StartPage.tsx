interface StartPageProps {
  onSinglePlayer: () => void;
  onHostGame: () => void;
}

export const StartPage = ({ onSinglePlayer, onHostGame }: StartPageProps) => {
  return (
    <div className="start-screen">
      <div className="menu-buttons">
        <button onClick={onSinglePlayer} className="menu-button">
          Single Player
        </button>
        <button onClick={onHostGame} className="menu-button" disabled>
          Host Game
        </button>
      </div>
    </div>
  );
};
