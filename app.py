"""
Flask Application for Language Translator.
"""

import os

from flask import Flask, render_template, request, jsonify
from translate import translator_engine

app = Flask(__name__)


@app.route('/')
def index():
    """Render the main translator web application."""
    languages = translator_engine.get_supported_languages()
    return render_template('index.html', languages=languages)


@app.route('/api/languages', methods=['GET'])
def get_languages():
    """Return dictionary of supported languages."""
    return jsonify(translator_engine.get_supported_languages())


@app.route('/api/translate', methods=['POST'])
def translate_text():
    """
    Endpoint for handling text translation requests.
    Payload:
    {
        "text": str,
        "source_lang": str,
        "target_lang": str
    }
    """

    data = request.get_json() or {}

    text = data.get('text', '')
    source_lang = data.get('source_lang', 'auto')
    target_lang = data.get('target_lang', 'en')

    if not text.strip():
        return jsonify({
            'success': True,
            'translated_text': '',
            'source_lang': source_lang,
            'target_lang': target_lang,
            'model_used': 'Google Translate NMT'
        })

    translated_text, detected_src, success, model_used = translator_engine.translate(
        text=text,
        source_lang=source_lang,
        target_lang=target_lang
    )

    return jsonify({
        'success': success,
        'translated_text': translated_text,
        'source_lang': source_lang,
        'detected_lang': detected_src,
        'target_lang': target_lang,
        'char_count': len(text),
        'model_used': model_used
    }), (200 if success else 500)


@app.route('/api/detect', methods=['POST'])
def detect_language():
    """
    Endpoint for auto-detecting language of provided text.
    Payload:
    {
        "text": str
    }
    """

    data = request.get_json() or {}
    text = data.get('text', '')

    detected = translator_engine.detect_language(text)

    return jsonify({
        'success': True,
        'detected_lang': detected
    })


if __name__ == '__main__':
    debug_mode = os.getenv(
        'FLASK_DEBUG', '0'
    ) in ('1', 'true', 'True')

    print(
        "Starting Language Translator Server at "
        "http://0.0.0.0:5000 ..."
    )

    app.run(
        debug=debug_mode,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )