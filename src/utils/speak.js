export function speakGerman(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const de = voices.find((v) => v.lang.startsWith('de'));
  if (de) u.voice = de;
  window.speechSynthesis.speak(u);
}
