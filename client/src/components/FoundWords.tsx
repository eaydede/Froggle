import { Word } from 'models';

interface FoundWordsProps {
  words: Word[];
  title?: string;
}

export const FoundWords = ({ words, title = 'Words Found' }: FoundWordsProps) => {
  return (
    <div className="words-found">
      <h3>{title} ({words.length})</h3>
      <div className="words-list">
        {words.map((w, i) => (
          <div key={i} className="word-item">{w.word}</div>
        ))}
      </div>
    </div>
  );
};
