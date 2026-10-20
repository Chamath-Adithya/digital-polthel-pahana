const grid = document.getElementById("lamp-grid");
const countLabel = document.getElementById("lit-count");
const progressFill = document.getElementById("progress-fill");
const message = document.getElementById("ceremony-message");
const finale = document.getElementById("finale");
const connection = document.getElementById("display-connection");
const overlay = document.getElementById("welcome-overlay");
const beginButton = document.getElementById("begin-button");
const fullscreenButton = document.getElementById("fullscreen-button");

let previousLamps = Array(15).fill(false);
let soundEnabled = false;
let audioContext;

const lampLayout = [
  { x: 50, y: 15, scale: 0.66, depth: 2 },
  { x: 36, y: 27, scale: 0.72, depth: 3 },
  { x: 64, y: 27, scale: 0.72, depth: 3 },
  { x: 22, y: 39, scale: 0.77, depth: 4 },
  { x: 78, y: 39, scale: 0.77, depth: 4 },
  { x: 42, y: 42, scale: 0.84, depth: 5 },
  { x: 58, y: 42, scale: 0.84, depth: 5 },
  { x: 50, y: 58, scale: 1.04, depth: 8 },
  { x: 29, y: 57, scale: 0.91, depth: 7 },
  { x: 71, y: 57, scale: 0.91, depth: 7 },
  { x: 13, y: 72, scale: 0.96, depth: 9 },
  { x: 32, y: 76, scale: 1.02, depth: 10 },
  { x: 50, y: 80, scale: 1.13, depth: 12 },
  { x: 68, y: 76, scale: 1.02, depth: 10 },
  { x: 87, y: 72, scale: 0.96, depth: 9 },
];

function lampMarkup(index) {
  const position = lampLayout[index];
  const motes = Array.from({ length: 6 }, (_, mote) => `<i class="ember ember-${mote + 1}"></i>`).join("");
  return `
    <article class="oil-lamp" data-lamp="${index}" style="--x:${position.x}%;--y:${position.y}%;--s:${position.scale};--depth:${position.depth}" aria-label="Pahana ${index + 1}, unlit">
      <div class="lamp-aura"></div>
      <div class="flame-wrap">
        <span class="ignition-bloom"></span>
        <span class="flame-glow"></span>
        <span class="smoke smoke-one"></span>
        <span class="smoke smoke-two"></span>
        <span class="flame"><i class="flame-core"><b></b></i></span>
        ${motes}
      </div>
      <div class="wick"></div>
      <div class="lamp-bowl"><div class="oil"></div><div class="bowl-engraving"></div><div class="spout"></div></div>
      <div class="lamp-neck"><i></i></div>
      <div class="lamp-foot"></div>
      <span class="lamp-number">${String(index + 1).padStart(2, "0")}</span>
    </article>`;
}

grid.innerHTML = Array.from({ length: 15 }, (_, index) => lampMarkup(index)).join("");

function playChime(index, isFinale = false) {
  if (!soundEnabled) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  const notes = isFinale ? [261.63, 329.63, 392, 523.25] : [392 + (index % 5) * 16, 523.25];
  notes.forEach((frequency, noteIndex) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = noteIndex === 0 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + noteIndex * 0.07);
    gain.gain.setValueAtTime(0, now + noteIndex * 0.07);
    gain.gain.linearRampToValueAtTime(isFinale ? 0.1 : 0.06, now + noteIndex * 0.07 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + noteIndex * 0.07 + 1.3);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + noteIndex * 0.07);
    oscillator.stop(now + noteIndex * 0.07 + 1.35);
  });
}

function renderState(state) {
  const lit = state.lamps.filter(Boolean).length;
  document.querySelectorAll(".oil-lamp").forEach((lamp, index) => {
    const isLit = state.lamps[index];
    const justLit = isLit && !previousLamps[index];
    lamp.classList.toggle("is-lit", isLit);
    lamp.classList.toggle("just-lit", justLit);
    lamp.setAttribute("aria-label", `Pahana ${index + 1}, ${isLit ? "lit" : "unlit"}`);
    if (justLit) {
      window.setTimeout(() => lamp.classList.remove("just-lit"), 1100);
      playChime(index, lit === 15);
    }
  });

  countLabel.textContent = lit;
  progressFill.style.width = `${(lit / 15) * 100}%`;
  message.textContent = lit === 0
    ? "Awaiting the ceremonial lighting"
    : lit === 15
      ? "The ceremony is illuminated"
      : `${String(lit).padStart(2, "0")} of 15 ceremonial lights now shine`;

  finale.classList.toggle("is-visible", lit === 15);
  finale.setAttribute("aria-hidden", lit !== 15);
  previousLamps = [...state.lamps];
}

Pahana.connectionBadge(connection);
Pahana.onState(renderState);

if (new URLSearchParams(window.location.search).has("preview")) {
  overlay.classList.add("is-hidden");
}

async function enterFullscreen() {
  soundEnabled = true;
  if (audioContext?.state === "suspended") await audioContext.resume();
  overlay.classList.add("is-hidden");
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch (_) {
    // Fullscreen may be blocked by some embedded browsers; display remains usable.
  }
}

beginButton.addEventListener("click", enterFullscreen);
fullscreenButton.addEventListener("click", enterFullscreen);
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f") enterFullscreen();
});
