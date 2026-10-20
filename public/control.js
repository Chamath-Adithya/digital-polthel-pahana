const controlGrid = document.getElementById("control-grid");
const count = document.getElementById("control-count");
const statusLabel = document.getElementById("status-label");
const progress = document.getElementById("control-progress-fill");
const nextButton = document.getElementById("next-button");
const nextLabel = document.getElementById("next-label");
const allButton = document.getElementById("all-button");
const resetButton = document.getElementById("reset-button");
const toast = document.getElementById("toast");
const connection = document.getElementById("control-connection");

let currentState = Array(15).fill(false);
let toastTimer;

function vibrate(pattern) {
  if (navigator.userActivation?.isActive) navigator.vibrate?.(pattern);
}

controlGrid.innerHTML = Array.from({ length: 15 }, (_, index) => `
  <button class="lamp-control" type="button" data-index="${index}" aria-label="Light pahana ${index + 1}">
    <span class="mini-flame"><i></i></span>
    <small>PAHANA</small>
    <strong>${String(index + 1).padStart(2, "0")}</strong>
    <em>Ready</em>
  </button>`).join("");

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function renderState(state) {
  currentState = [...state.lamps];
  const lit = currentState.filter(Boolean).length;
  const nextIndex = currentState.findIndex((lamp) => !lamp);

  count.textContent = lit;
  progress.style.width = `${(lit / 15) * 100}%`;
  statusLabel.textContent = lit === 0 ? "Ready to begin" : lit === 15 ? "Ceremony complete" : "Ceremony in progress";
  nextLabel.textContent = nextIndex === -1 ? "All Pahan Are Lit" : `Light Pahana ${String(nextIndex + 1).padStart(2, "0")}`;
  nextButton.disabled = nextIndex === -1;
  allButton.disabled = lit === 15;
  resetButton.disabled = lit === 0;

  document.querySelectorAll(".lamp-control").forEach((button, index) => {
    const isLit = currentState[index];
    button.classList.toggle("is-lit", isLit);
    button.disabled = isLit;
    button.querySelector("em").textContent = isLit ? "Shining" : "Ready";
  });

  if (state.effect?.type === "ignite") showToast(`Pahana ${String(state.effect.index + 1).padStart(2, "0")} is now shining`);
  if (state.effect?.type === "reset") showToast("Ceremony has been reset");
  if (state.effect?.type === "all") showToast("All fifteen pahan are shining");
}

controlGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".lamp-control");
  if (!button || button.disabled) return;
  Pahana.ignite(Number(button.dataset.index));
  vibrate(35);
});

nextButton.addEventListener("click", () => {
  if (nextButton.disabled) return;
  Pahana.next();
  vibrate(40);
});

function addHoldAction(button, action) {
  let timer;
  let started = false;

  const cancel = () => {
    clearTimeout(timer);
    button.classList.remove("is-holding");
    started = false;
  };

  const start = (event) => {
    if (button.disabled || started) return;
    event.preventDefault();
    started = true;
    button.classList.add("is-holding");
    vibrate(20);
    timer = setTimeout(() => {
      action();
      vibrate([50, 40, 80]);
      cancel();
    }, 1500);
  };

  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", cancel);
  button.addEventListener("pointercancel", cancel);
  button.addEventListener("pointerleave", cancel);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

addHoldAction(allButton, () => Pahana.lightAll());
addHoldAction(resetButton, () => Pahana.reset());
Pahana.connectionBadge(connection);
Pahana.onState(renderState);
