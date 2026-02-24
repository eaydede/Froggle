import fs from "fs"

export function loadDictionary(filePath: string): Set<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const words = content.split('\n').map(word => word.trim().toLowerCase())
    return new Set<string>(words);
}

export function isValidWord(dictionary: Set<string>, word: string): boolean {
  return dictionary.has(word);
}