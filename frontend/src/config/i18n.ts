import en from './locales/en.json'
import id from './locales/id.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'

export type Language = 'EN' | 'ID' | 'FR' | 'JA'

export const dictionaries = {
  EN: en,
  ID: id,
  FR: fr,
  JA: ja,
} as const

export type DictionaryKey = keyof typeof dictionaries.EN
