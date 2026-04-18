import { useDefinition } from '../hooks/useDefinition';

interface DefinitionPanelProps {
  word: string;
}

export function DefinitionPanel({ word }: DefinitionPanelProps) {
  const { definition, loading } = useDefinition(word);

  return (
    <div className="p-3 text-[length:var(--text-small)] text-[var(--text-mid)] flex-1 overflow-y-auto min-h-0 font-[family-name:var(--font-serif)] font-normal leading-[19.5px]">
      {loading ? (
        <div className="text-[var(--text-faint)] italic">...</div>
      ) : definition ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-black text-base text-[var(--text)]">{definition.word}</span>
            {definition.phonetic && (
              <span className="text-[length:var(--text-small)] text-[var(--text-muted)] italic">{definition.phonetic}</span>
            )}
          </div>
          {definition.meanings.map((meaning, i) => (
            <div key={i} className="mb-2">
              <span className="italic text-[var(--text-mid)] text-xs">{meaning.partOfSpeech}</span>
              <ol className="mt-0.5 pl-[18px] font-normal">
                {meaning.definitions.map((def, j) => (
                  <li key={j} className="mb-0.5">
                    {def.definition}
                    {def.example && (
                      <span className="block italic text-[var(--text-muted)] mt-px text-xs">"{def.example}"</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="font-black text-base text-[var(--text)]">{word.toLowerCase()}</span>
          <span className="italic text-[var(--text-faint)] text-xs">Definition not available</span>
        </div>
      )}
    </div>
  );
}
