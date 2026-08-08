/**
 * GlobeLingo AI - Main Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const sourceText = document.getElementById('sourceText');
    const targetText = document.getElementById('targetText');
    const sourceLangSelect = document.getElementById('sourceLangSelect');
    const targetLangSelect = document.getElementById('targetLangSelect');
    
    const translateBtn = document.getElementById('translateBtn');
    const swapLangBtn = document.getElementById('swapLangBtn');
    const clearTextBtn = document.getElementById('clearTextBtn');
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const pasteTextBtn = document.getElementById('pasteTextBtn');
    
    const speakSourceBtn = document.getElementById('speakSourceBtn');
    const speakTargetBtn = document.getElementById('speakTargetBtn');
    const copyTargetBtn = document.getElementById('copyTargetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const currentCharCount = document.getElementById('currentCharCount');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const detectedBadge = document.getElementById('detectedBadge');
    const detectedLangName = document.getElementById('detectedLangName');
    const modelName = document.getElementById('modelName');
    const latencyInfo = document.getElementById('latencyInfo');
    
    const themeToggle = document.getElementById('themeToggle');
    const presetPills = document.querySelectorAll('.preset-pill');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const toastContainer = document.getElementById('toastContainer');

    // --- State Variables ---
    let debounceTimer = null;
    let recognition = null;
    let isListening = false;
    let lastTranslationResult = "";

    // --- 1. Theme Management ---
    const savedTheme = localStorage.getItem('globelingo_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('globelingo_theme', newTheme);
        updateThemeIcon(newTheme);
        showToast(`Switched to ${newTheme} theme`, 'info');
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'light') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    }

    // --- 2. Character Counter & Input Listener ---
    sourceText.addEventListener('input', () => {
        const count = sourceText.value.length;
        currentCharCount.textContent = count;

        if (count === 0) {
            clearOutput();
            return;
        }

        // Auto-translate debounce
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performTranslation();
        }, 500);
    });

    clearTextBtn.addEventListener('click', () => {
        sourceText.value = '';
        currentCharCount.textContent = '0';
        clearOutput();
        sourceText.focus();
    });

    function clearOutput() {
        targetText.innerHTML = '<span class="placeholder-text">Human-like natural translation will appear here...</span>';
        detectedBadge.style.display = 'none';
        latencyInfo.textContent = '';
        lastTranslationResult = "";
    }

    // --- 3. Language Swap ---
    swapLangBtn.addEventListener('click', () => {
        const currentSource = sourceLangSelect.value;
        const currentTarget = targetLangSelect.value;

        if (currentSource === 'auto') {
            showToast('Cannot swap when source is set to Auto Detect', 'warning');
            return;
        }

        // Swap select values
        sourceLangSelect.value = currentTarget;
        targetLangSelect.value = currentSource;

        // Swap text contents if target has content
        if (lastTranslationResult) {
            sourceText.value = lastTranslationResult;
            currentCharCount.textContent = sourceText.value.length;
            performTranslation();
        }

        updatePresetPillsActiveState();
        showToast('Languages swapped', 'info');
    });

    // --- 4. Preset Pills ---
    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const src = pill.getAttribute('data-src');
            const tgt = pill.getAttribute('data-tgt');

            sourceLangSelect.value = src;
            targetLangSelect.value = tgt;

            presetPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            if (sourceText.value.trim()) {
                performTranslation();
            }
        });
    });

    function updatePresetPillsActiveState() {
        const src = sourceLangSelect.value;
        const tgt = targetLangSelect.value;
        presetPills.forEach(pill => {
            if (pill.getAttribute('data-src') === src && pill.getAttribute('data-tgt') === tgt) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
    }

    sourceLangSelect.addEventListener('change', updatePresetPillsActiveState);
    targetLangSelect.addEventListener('change', updatePresetPillsActiveState);

    // --- 5. AJAX Translation Execution ---
    translateBtn.addEventListener('click', () => performTranslation());

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            performTranslation();
        }
    });

    async function performTranslation() {
        const text = sourceText.value.trim();
        if (!text) return;

        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        // Show loading state
        loadingOverlay.style.display = 'flex';
        const startTime = performance.now();

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    source_lang: sourceLang,
                    target_lang: targetLang
                })
            });

            const data = await response.json();
            const elapsedTime = Math.round(performance.now() - startTime);

            if (data.success && data.translated_text) {
                targetText.textContent = data.translated_text;
                lastTranslationResult = data.translated_text;

                if (data.model_used && modelName) {
                    modelName.textContent = data.model_used;
                }

                // Show detected language if auto
                if (sourceLang === 'auto' && data.detected_lang) {
                    const option = sourceLangSelect.querySelector(`option[value="${data.detected_lang}"]`);
                    const langName = option ? option.textContent : data.detected_lang;
                    detectedLangName.textContent = `Detected: ${langName}`;
                    detectedBadge.style.display = 'inline-flex';
                } else {
                    detectedBadge.style.display = 'none';
                }

                latencyInfo.textContent = `${elapsedTime} ms`;
                saveToHistory(text, data.translated_text, sourceLang, targetLang);
            } else {
                targetText.textContent = data.translated_text || 'Translation error occurred.';
            }
        } catch (error) {
            console.error('Translation failed:', error);
            showToast('Network error during translation', 'danger');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // --- 6. Clipboard Actions ---
    pasteTextBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                sourceText.value = text;
                currentCharCount.textContent = text.length;
                performTranslation();
                showToast('Pasted from clipboard', 'info');
            }
        } catch (err) {
            showToast('Unable to access clipboard', 'warning');
        }
    });

    copyTargetBtn.addEventListener('click', () => {
        if (!lastTranslationResult) return;
        navigator.clipboard.writeText(lastTranslationResult).then(() => {
            showToast('Translation copied to clipboard!', 'success');
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (!lastTranslationResult) return;
        const blob = new Blob([lastTranslationResult], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation_${targetLangSelect.value}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Downloaded translation file', 'success');
    });

    // --- 7. Speech Recognition (Dictation) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        voiceInputBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                const lang = sourceLangSelect.value === 'auto' ? 'en-US' : sourceLangSelect.value;
                recognition.lang = lang;
                recognition.start();
            }
        });

        recognition.onstart = () => {
            isListening = true;
            voiceInputBtn.classList.add('listening');
            voiceInputBtn.querySelector('span').textContent = 'Listening...';
            showToast('Listening... Speak now', 'info');
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            sourceText.value = transcript;
            currentCharCount.textContent = transcript.length;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            showToast('Speech recognition error: ' + event.error, 'danger');
            stopListeningState();
        };

        recognition.onend = () => {
            stopListeningState();
            if (sourceText.value.trim()) {
                performTranslation();
            }
        };

        function stopListeningState() {
            isListening = false;
            voiceInputBtn.classList.remove('listening');
            voiceInputBtn.querySelector('span').textContent = 'Listen';
        }
    } else {
        voiceInputBtn.style.display = 'none';
    }

    // --- 8. Text-to-Speech (TTS) ---
    speakSourceBtn.addEventListener('click', () => {
        const text = sourceText.value.trim();
        if (text) speakText(text, sourceLangSelect.value);
    });

    speakTargetBtn.addEventListener('click', () => {
        if (lastTranslationResult) speakText(lastTranslationResult, targetLangSelect.value);
    });

    function speakText(text, langCode) {
        if (!('speechSynthesis' in window)) {
            showToast('Text-to-Speech not supported in your browser', 'warning');
            return;
        }

        window.speechSynthesis.cancel(); // Stop ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode === 'auto' ? 'en-US' : langCode;
        window.speechSynthesis.speak(utterance);
    }

    // --- 9. LocalStorage Translation History ---
    loadHistory();

    function saveToHistory(srcText, tgtText, srcLang, tgtLang) {
        let history = JSON.parse(localStorage.getItem('globelingo_history') || '[]');
        
        // Remove duplicate if same source text exists
        history = history.filter(item => item.srcText !== srcText);
        
        history.unshift({
            id: Date.now(),
            srcText,
            tgtText,
            srcLang,
            tgtLang,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Limit to 10 history items
        if (history.length > 10) history.pop();

        localStorage.setItem('globelingo_history', JSON.stringify(history));
        renderHistory(history);
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('globelingo_history') || '[]');
        renderHistory(history);
    }

    function renderHistory(history) {
        if (!history || history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No recent translations. Start translating above!</p>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-content">
                    <span class="history-meta">${item.srcLang.toUpperCase()} &rarr; ${item.tgtLang.toUpperCase()} &bull; ${item.timestamp}</span>
                    <span class="history-src">${escapeHtml(item.srcText)}</span>
                    <span class="history-tgt">${escapeHtml(item.tgtText)}</span>
                </div>
                <div class="history-actions">
                    <button class="tool-btn reuse-history-btn" title="Use translation"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                </div>
            </div>
        `).join('');

        // Attach click handlers to reuse items
        document.querySelectorAll('.reuse-history-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const item = history[index];
                sourceLangSelect.value = item.srcLang;
                targetLangSelect.value = item.tgtLang;
                sourceText.value = item.srcText;
                currentCharCount.textContent = item.srcText.length;
                performTranslation();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('globelingo_history');
        renderHistory([]);
        showToast('History cleared', 'info');
    });

    // --- 10. Toast Notification Manager ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';
        if (type === 'danger') icon = 'fa-times-circle';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
