// Hold-to-talk with the browser's speech recognition (th-TH).
// Returns null when the browser has none; the presenter then uses the fallback text input.
export function createListener({ onInterim, onFinal, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  let rec = null;
  let finalText = '';
  let lastInterim = '';

  return {
    start() {
      finalText = '';
      lastInterim = '';
      rec = new SR();
      rec.lang = 'th-TH';
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        lastInterim = interim;
        onInterim?.(finalText + interim);
      };
      rec.onerror = (e) => onError?.(e.error);
      rec.onend = () => {
        const text = (finalText || lastInterim).trim();
        rec = null;
        if (text) onFinal?.(text);
      };
      rec.start();
    },
    stop() {
      rec?.stop();
    },
  };
}
