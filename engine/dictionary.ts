export function parseDictionary(content: string): Set<string> {
  return new Set(content.split('\n').map(word => word.trim().toLowerCase()));
}

export function isValidWord(dictionary: Set<string>, word: string): boolean {
  return dictionary.has(word);
}
