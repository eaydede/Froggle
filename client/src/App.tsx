import { useState } from 'react';
import { GameState, Position } from 'models';
import { useGameApi } from './hooks/useGameApi';
import { useTimer } from './hooks/useTimer';
import { StartPage } from './pages/StartPage';
import { ConfigPage } from './pages/ConfigPage';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import { FeedbackType } from './components/Board';
import './App.css';

function App() {
  const { game, words, createGame, startGame, cancelGame, endGame, fetchGameState, submitWord } = useGameApi();
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);

  const timeRemaining = useTimer(game, fetchGameState);

  const handleSinglePlayer = async () => {
    await createGame();
  };

  const handleHostGame = () => {
    // Placeholder for multiplayer functionality
    console.log('Host Game clicked - feature not yet implemented');
  };

  const handleBackToStart = async () => {
    await cancelGame();
  };

  const handleStartGame = async (boardSize: number, timeLimit: number, minWordLength: number) => {
    await startGame(timeLimit, boardSize, minWordLength);
    setFeedback(null);
  };

  const handleCancelGame = async () => {
    await cancelGame();
  };

  const handleEndGame = async () => {
    await endGame();
  };

  const handlePlayAgain = async () => {
    await createGame();
  };

  const handleSubmitWord = async (path: Position[]) => {
    const result = await submitWord(path);
    
    let feedbackType: FeedbackType;
    if (result.valid) {
      feedbackType = 'valid';
      fetchGameState();
    } else if (result.reason === 'Word already found') {
      feedbackType = 'duplicate';
    } else {
      feedbackType = 'invalid';
    }
    
    setFeedback({ type: feedbackType, path });
    setTimeout(() => setFeedback(null), 200);
  };

  const renderPage = () => {
    const status = game?.status ?? null;

    switch (status) {
      case null:  // No game created yet - show start screen
        return (
          <StartPage 
            onSinglePlayer={handleSinglePlayer}
            onHostGame={handleHostGame}
          />
        );

      case GameState.Config:  // Game created, in config phase
        return (
          <ConfigPage 
            onStartGame={handleStartGame}
            onBack={handleBackToStart}
          />
        );

      case GameState.InProgress:  // Game is active
        return (
          <GamePage 
            game={game!}
            words={words}
            timeRemaining={timeRemaining}
            feedback={feedback}
            onSubmitWord={handleSubmitWord}
            onCancelGame={handleCancelGame}
            onEndGame={handleEndGame}
          />
        );

      case GameState.Finished:
        return <ResultsPage words={words} onPlayAgain={handlePlayAgain} />;

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
