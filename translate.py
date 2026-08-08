"""
Translation module for the Language Translator application.
Leverages Google Translate Neural Machine Translation (NMT) models with fallbacks
to deliver natural, fluent, human-like language translations.
"""

import logging
import requests
import html
from typing import Dict, Tuple, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Comprehensive dictionary of supported languages (code: display name)
SUPPORTED_LANGUAGES: Dict[str, str] = {
    'auto': 'Auto Detect',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'th': 'Thai',
    'el': 'Greek',
    'cs': 'Czech',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'uk': 'Ukrainian',
    'he': 'Hebrew',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi',
    'ur': 'Urdu'
}

class TranslatorEngine:
    def __init__(self):
        self.languages = SUPPORTED_LANGUAGES
        self.model_name = "Google Translate NMT (Neural Machine Translation)"

    def get_supported_languages(self) -> Dict[str, str]:
        """Return the dictionary of supported languages."""
        return self.languages

    def _clean_natural_text(self, text: str) -> str:
        """
        Post-process translated output to make it natural and clean:
        - Unescapes HTML entities (e.g. &quot; -> ", &#39; -> ')
        - Normalizes multiple spaces and trims unnecessary whitespace
        """
        if not text:
            return ""
        
        cleaned = html.unescape(text)
        cleaned = " ".join(cleaned.split())
        return cleaned

    def translate(self, text: str, source_lang: str = 'auto', target_lang: str = 'en') -> Tuple[str, str, bool, str]:
        """
        Translate input text from source_lang to target_lang using Google Neural Translation.
        
        Returns:
            Tuple[translated_text, detected_source_lang, is_success, model_used]
        """
        if not text or not text.strip():
            return "", source_lang, True, self.model_name

        text = text.strip()
        source_code = source_lang if source_lang in self.languages else 'auto'
        target_code = target_lang if target_lang in self.languages else 'en'

        # Engine 1: Google Translate NMT via deep-translator
        try:
            from deep_translator import GoogleTranslator
            translator = GoogleTranslator(source=source_code, target=target_code)
            translated = translator.translate(text)
            if translated:
                clean_output = self._clean_natural_text(translated)
                return clean_output, source_code, True, "Google Translate NMT"
        except Exception as e:
            logger.warning(f"deep-translator Google NMT primary attempt failed: {e}. Trying direct Google RPC...")

        # Engine 2: Direct Google Neural Translate GTX Web RPC
        try:
            url = "https://translate.googleapis.com/translate_a/single"
            params = {
                "client": "gtx",
                "sl": source_code,
                "tl": target_code,
                "dt": "t",
                "q": text
            }
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                translated_parts = [item[0] for item in data[0] if item[0]]
                translated = "".join(translated_parts)
                detected = data[2] if len(data) > 2 and data[2] else source_code
                if translated:
                    clean_output = self._clean_natural_text(translated)
                    return clean_output, detected, True, "Google Translate NMT (Direct)"
        except Exception as e:
            logger.warning(f"Direct Google RPC failed: {e}. Trying MyMemory NLP fallback...")

        # Engine 3: MyMemory API fallback
        try:
            detected_src = source_code if source_code != 'auto' else 'en'
            lang_pair = f"{detected_src}|{target_code}"
            url = "https://api.mymemory.translated.net/get"
            params = {"q": text, "langpair": lang_pair}
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                translated = data.get("responseData", {}).get("translatedText", "")
                if translated:
                    clean_output = self._clean_natural_text(translated)
                    return clean_output, source_code, True, "MyMemory Neural Fallback"
        except Exception as e:
            logger.error(f"MyMemory API fallback failed: {e}")

        return "Translation service unavailable. Please check your internet connection.", source_code, False, "None"

    def detect_language(self, text: str) -> str:
        """Detect language of the given text accurately."""
        if not text or not text.strip():
            return 'auto'

        # Primary: Google Web RPC detection
        try:
            url = "https://translate.googleapis.com/translate_a/single"
            params = {"client": "gtx", "sl": "auto", "tl": "en", "dt": "t", "q": text[:100]}
            res = requests.get(url, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if len(data) > 2 and data[2]:
                    return data[2]
        except Exception:
            pass

        try:
            from deep_translator import single_detection
            detected = single_detection(text, api_key='free')
            if detected and detected in self.languages:
                return detected
        except Exception:
            pass

        return 'auto'


# Singleton instance for simple importing
translator_engine = TranslatorEngine()

if __name__ == "__main__":
    # Test translation engine locally
    res, src, success, model = translator_engine.translate("How are you doing today? I hope everything is going well.", "en", "es")
    print(f"Test Translation (en->es): {res} [Model: {model}]")
