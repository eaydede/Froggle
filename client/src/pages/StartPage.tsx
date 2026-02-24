interface StartPageProps {
  onStartGame: () => void;
}

export const StartPage = ({ onStartGame }: StartPageProps) => {
  return (
    <div className="start-screen">
      <button onClick={onStartGame} className="start-button">
        Start Game
      </button>
    </div>
  );
};
