declare module "node-nlp" {
  export class NlpManager {
    constructor(options?: { languages: string[]; forceNER?: boolean });
    addDocument(language: string, utterance: string, intent: string): void;
    train(): Promise<void>;
    process(
      language: string,
      utterance: string
    ): Promise<{
      intent: string;
      score: number;
      entities: Array<{
        start: number;
        end: number;
        levenshtein: number;
        accuracy: number;
        entity: string;
        option: string;
        sourceText: string;
        utteranceText: string;
      }>;
      tokens: string[];
    }>;
  }
}
