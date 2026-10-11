export type LanguageOption = {
  value: string;
  label: string;
  name: string;
};

export const LANGUAGES: LanguageOption[] = [
  { value: "auto", label: "Auto (defaults to English)", name: "English" },
  { value: "en", label: "English", name: "English" },
  { value: "hinglish", label: "Hinglish", name: "natural Hinglish (Hindi written in Latin script)" },
  { value: "hi", label: "Hindi (हिन्दी)", name: "Hindi (Devanagari)" },
  { value: "bn", label: "Bengali (বাংলা)", name: "Bengali" },
  { value: "mr", label: "Marathi (मराठी)", name: "Marathi" },
  { value: "ta", label: "Tamil (தமிழ்)", name: "Tamil" },
  { value: "te", label: "Telugu (తెలుగు)", name: "Telugu" },
  { value: "kn", label: "Kannada (ಕನ್ನಡ)", name: "Kannada" },
  { value: "ml", label: "Malayalam (മലയാളം)", name: "Malayalam" },
  { value: "gu", label: "Gujarati (ગુજરાતી)", name: "Gujarati" },
  { value: "pa", label: "Punjabi (ਪੰਜਾਬੀ)", name: "Punjabi" },
  { value: "ur", label: "Urdu (اردو)", name: "Urdu" },
  { value: "or", label: "Odia (ଓଡ଼ିଆ)", name: "Odia" },
  { value: "as", label: "Assamese (অসমীয়া)", name: "Assamese" },
  { value: "si", label: "Sinhala (සිංහල)", name: "Sinhala" },
  { value: "ne", label: "Nepali (नेपाली)", name: "Nepali" },
  { value: "es", label: "Spanish (Español)", name: "Spanish" },
  { value: "fr", label: "French (Français)", name: "French" },
  { value: "de", label: "German (Deutsch)", name: "German" },
  { value: "pt", label: "Portuguese (Português)", name: "Portuguese" },
  { value: "it", label: "Italian (Italiano)", name: "Italian" },
  { value: "nl", label: "Dutch (Nederlands)", name: "Dutch" },
  { value: "ru", label: "Russian (Русский)", name: "Russian" },
  { value: "uk", label: "Ukrainian (Українська)", name: "Ukrainian" },
  { value: "ar", label: "Arabic (العربية)", name: "Arabic" },
  { value: "he", label: "Hebrew (עברית)", name: "Hebrew" },
  { value: "fa", label: "Persian (فارسی)", name: "Persian" },
  { value: "tr", label: "Turkish (Türkçe)", name: "Turkish" },
  { value: "zh", label: "Chinese (中文)", name: "Chinese" },
  { value: "ja", label: "Japanese (日本語)", name: "Japanese" },
  { value: "ko", label: "Korean (한국어)", name: "Korean" },
  { value: "th", label: "Thai (ไทย)", name: "Thai" },
  { value: "vi", label: "Vietnamese (Tiếng Việt)", name: "Vietnamese" },
  { value: "id", label: "Indonesian (Bahasa Indonesia)", name: "Indonesian" },
  { value: "ms", label: "Malay (Bahasa Melayu)", name: "Malay" },
  { value: "tl", label: "Filipino", name: "Filipino" },
  { value: "pl", label: "Polish (Polski)", name: "Polish" },
  { value: "cs", label: "Czech (Čeština)", name: "Czech" },
  { value: "ro", label: "Romanian (Română)", name: "Romanian" },
  { value: "el", label: "Greek (Ελληνικά)", name: "Greek" },
  { value: "sv", label: "Swedish (Svenska)", name: "Swedish" },
  { value: "no", label: "Norwegian (Norsk)", name: "Norwegian" },
  { value: "da", label: "Danish (Dansk)", name: "Danish" },
  { value: "fi", label: "Finnish (Suomi)", name: "Finnish" },
];

export const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value, l.name]),
);