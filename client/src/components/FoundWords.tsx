import { Word } from 'models';

interface FoundWordsProps {
  words: Word[];
  title?: string;
}

export const FoundWords = ({ words, title = 'Words Found' }: FoundWordsProps) => {
  return (
    <div className="mt-8">
      <h3 className="mb-2.5">{title} ({words.length})</h3>
      <div className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <div key={i} className="py-1.5 px-3 bg-[#e3f2fd] rounded font-medium">{w.word}</div>
        ))}
      </div>
    </div>
  );
};
