export type Locale = 'es' | 'en' | 'fr' | 'de' | 'it';
export type LocaleSetting = 'auto' | Locale;

export type TranslationDict = Record<string, string | Record<string, string>>;
