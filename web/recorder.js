/* Grabador del tutor (copiado de Polski Box): micrófono → MediaRecorder → recorte de silencios y normalización
   → MP3 mono de 24 kHz y 48 kbps con lamejs, listo para subir. El MP3 suena en Android, iPad, Windows y cualquier
   navegador, y una frase pesa unos 10–20 KB. https://developer.mozilla.org/es/docs/Web/API/MediaRecorder */
(function () {
'use strict';
let stream = null, rec = null, chunks = [], ac = null, an = null, raf = 0, stopTimer = 0, onLevel = null;
const RATE = 24000, KBPS = 48, MAX_MS = 20000;   // las líneas de diálogo pueden ser largas

function supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext)); }

async function start(levelCb, autoStop) {
  onLevel = levelCb || null;
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  chunks = [];
  rec = new MediaRecorder(stream);
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start();
  try {   // live level meter
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 512; src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const tick = () => { if (!an) return; an.getByteTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128)); if (onLevel) onLevel(m / 128); raf = requestAnimationFrame(tick); };
    tick();
  } catch (e) {}
  stopTimer = setTimeout(() => { if (autoStop) autoStop(); }, MAX_MS);
}
function stop() {
  return new Promise(res => {
    clearTimeout(stopTimer); cancelAnimationFrame(raf);
    if (!rec) return res(null);
    rec.onstop = () => { const b = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); cleanup(); res(b); };
    try { rec.stop(); } catch (e) { cleanup(); res(null); }
  });
}
function cleanup() {
  try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { ac && ac.close(); } catch (e) {}
  stream = rec = ac = an = null;
}
const recording = () => !!rec;

/** Blob (webm/ogg/mp4 from MediaRecorder) -> { b64, url, secs } */
async function toMp3(blob) {
  const C = window.AudioContext || window.webkitAudioContext, ctx = new C();
  const ab = await blob.arrayBuffer();
  const audio = await new Promise((ok, bad) => { const p = ctx.decodeAudioData(ab, ok, bad); if (p && p.then) p.then(ok, bad); });
  try { ctx.close(); } catch (e) {}
  // mix to mono
  const n = audio.length, mono = new Float32Array(n);
  for (let c = 0; c < audio.numberOfChannels; c++) { const d = audio.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / audio.numberOfChannels; }
  // trim silence at both ends (keep 80 ms of air) and normalise to -1 dBFS
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mono[i]));
  if (peak < 0.01) throw new Error('silence');
  const th = Math.max(0.02, peak * 0.07), pad = Math.round(audio.sampleRate * 0.08);
  let a = 0, b = n - 1; while (a < n && Math.abs(mono[a]) < th) a++; while (b > a && Math.abs(mono[b]) < th) b--;
  a = Math.max(0, a - pad); b = Math.min(n - 1, b + pad * 2);
  const cut = mono.subarray(a, b + 1), g = 0.89 / peak;
  // resample with an offline context
  const outLen = Math.ceil(cut.length * RATE / audio.sampleRate);
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, off = new OC(1, outLen, RATE);
  const src = off.createBuffer(1, cut.length, audio.sampleRate); src.getChannelData(0).set(cut);
  const node = off.createBufferSource(); node.buffer = src; const gain = off.createGain(); gain.gain.value = g;
  node.connect(gain); gain.connect(off.destination); node.start();
  const rendered = await new Promise((ok, bad) => { off.oncomplete = e => ok(e.renderedBuffer); const p = off.startRendering(); if (p && p.then) p.then(ok, bad); });
  const f = rendered.getChannelData(0), pcm = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
  // fade in/out 10 ms against clicks
  const fd = Math.round(RATE * 0.01); for (let i = 0; i < fd && i < pcm.length; i++) { pcm[i] = pcm[i] * i / fd; pcm[pcm.length - 1 - i] = pcm[pcm.length - 1 - i] * i / fd; }
  const enc = new window.lamejs.Mp3Encoder(1, RATE, KBPS), parts = [];
  for (let i = 0; i < pcm.length; i += 1152) { const o = enc.encodeBuffer(pcm.subarray(i, i + 1152)); if (o.length) parts.push(new Uint8Array(o)); }
  const fl = enc.flush(); if (fl.length) parts.push(new Uint8Array(fl));
  const mp3 = new Blob(parts, { type: 'audio/mpeg' }), bytes = new Uint8Array(await mp3.arrayBuffer());
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { b64: btoa(bin), url: URL.createObjectURL(mp3), secs: Math.round(pcm.length / RATE * 10) / 10, bytes: bytes.length };
}
window.TBRec = { supported, start, stop, recording, toMp3 };
})();
