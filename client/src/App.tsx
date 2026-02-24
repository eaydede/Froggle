import { useState } from 'react';
import { GameStatus, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { StartPage } from './pages/StartPage';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import './App.css';

function App() {
  const { game, words, startGame, fetchGameState, submitWord } = useGameApi();
  const [message, setMessage] = useState('');

  const timeRemaining = useTimer(game, fetchGameState);

  const handleStartGame = async () => {
    await startGame(180);
    setMessage('');
  };

  const handleSubmitWord = async (path: Position[]) => {
    if (path.length < 3) {
      setMessage('Word must be at least 3 letters');
      return;
    }

    const result = await submitWord(path);
    
    if (result.valid) {
      setMessage(`✓ ${result.word}`);
      fetchGameState();
    } else {
      setMessage(`✗ ${result.word}: ${result.reason}`);
    }
    
    setTimeout(() => setMessage(''), 2000);
  };

  const renderPage = () => {
    const status = game?.status ?? null;
    
    switch (status) {
      case null:  // No game has been created yet
        return <StartPage onStartGame={handleStartGame} />;
      
      case GameStatus.InProgress:
        return (
          <GamePage 
            game={game!}
            words={words}
            timeRemaining={timeRemaining}
            message={message}
            onSubmitWord={handleSubmitWord}
          />
        );
      
      case GameStatus.Finished:
        return <ResultsPage words={words} onPlayAgain={handleStartGame} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <h1>Froggle</h1>
      {renderPage()}
    </div>
  );
}

export default App;
