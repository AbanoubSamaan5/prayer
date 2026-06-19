/* ==========================================
   IMPORTS
========================================== */

import {
  db,
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
  off,
} from "./firebase.js";

/* ==========================================
   DEFAULT PEOPLE
========================================== */

const DEFAULT_PEOPLE = [
  "Abanoub",
  "Ellen",
  "Martina",
  "Fady Peter",
  "Youstina Samy",
  "Kiven",
  "Sara",
  "Marleen",
  "Andrew",
  "Youstina Rasmy",
  "Maged",
  "Sandra",
  "Fady Nashaat",
  "Marina",
];

/* ==========================================
   DOM
========================================== */

const canvas = document.getElementById("wheelCanvas");

const ctx = canvas.getContext("2d");

const spinBtn = document.getElementById("spinBtn");

const winnerList = document.getElementById("winnerList");

const wheelSection = document.getElementById("wheelSection");

const lockedSection = document.getElementById("lockedSection");

const remainingSpinsEl = document.getElementById("remainingSpins");

const addBtn = document.getElementById("addBtn");

const resetBtn = document.getElementById("resetBtn");

const nextDayBtn = document.getElementById("nextDayBtn");

const nameInput = document.getElementById("nameInput");

/* ==========================================
   GLOBAL STATE
========================================== */

let state = {
  winners: [],

  remainingPool: [],

  remainingSpins: 2,
};

let unsubscribeRef = null;

let simulatedDayOffset = 0;

let spinning = false;

/* ==========================================
   WHEEL STATE
========================================== */

let currentRotation = 0;

let selectedWinnerIndex = -1;

/* ==========================================
   DATE HELPERS
========================================== */
function formatDate(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentDateKey() {
  const date = new Date();

  date.setDate(date.getDate() + simulatedDayOffset);

  return formatDate(date);
}

function getPreviousDateKey() {
  const date = new Date();

  date.setDate(date.getDate() - 1 + simulatedDayOffset);

  return formatDate(date);
}
const currentDateEl = document.getElementById("currentDate");
function updateDateUI() {
  const date = new Date();

  date.setDate(date.getDate() + simulatedDayOffset);

  currentDateEl.textContent = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
updateDateUI();
/* ==========================================
   DATABASE PATH
========================================== */

function getDayRef() {
  return ref(db, `dailyPrayerWheel/${getCurrentDateKey()}`);
}

/* ==========================================
   CREATE DAY NODE
========================================== */

async function initializeCurrentDay() {
  const currentRef = getDayRef();

  const currentSnap = await get(currentRef);

  if (currentSnap.exists()) {
    return;
  }

  let carriedPool = [...DEFAULT_PEOPLE];

  const previousSnap = await get(
    ref(db, `dailyPrayerWheel/${getPreviousDateKey()}`),
  );

  /*
    N-1 LOGIC

    If yesterday exists:

    Carry ONLY
    remainingPool

    Winners stay eliminated.
  */

  if (previousSnap.exists()) {
    const previousData = previousSnap.val();

    if (previousData?.remainingPool?.length) {
      carriedPool = previousData.remainingPool;
    }
  }

  await set(
    currentRef,

    {
      date: getCurrentDateKey(),

      remainingSpins: 2,

      winners: [],

      remainingPool: carriedPool,

      createdAt: Date.now(),
    },
  );
}

/* ==========================================
   REALTIME LISTENER
========================================== */

function subscribeToCurrentDay() {
  if (unsubscribeRef) {
    off(unsubscribeRef);
  }

  unsubscribeRef = getDayRef();

  onValue(
    unsubscribeRef,

    (snapshot) => {
      const data = snapshot.val();

      if (!data) return;

      state = {
        winners: [],

        remainingPool: [],

        remainingSpins: 2,

        ...data,
      };

      render();

      drawWheel();
    },
  );
}

/* ==========================================
   UI VISIBILITY
========================================== */

function updateVisibility() {
  const noSpinsLeft = state.remainingSpins <= 0;

  const noCandidates = state.remainingPool.length === 0;

  if (noSpinsLeft || noCandidates) {
    wheelSection.classList.add("hidden");

    lockedSection.classList.remove("hidden");
  } else {
    wheelSection.classList.remove("hidden");

    lockedSection.classList.add("hidden");
  }
}

/* ==========================================
   RENDER
========================================== */

function render() {
  remainingSpinsEl.textContent = state.remainingSpins;

  updateVisibility();

  renderWinners();
}

/* ==========================================
   BOOTSTRAP
========================================== */

async function init() {
  await initializeCurrentDay();

  subscribeToCurrentDay();
}

init();

/* ==========================================
   SPIN CONFIG
========================================== */

const SPIN_DURATION = 4000;

const MIN_SPINS = 8;

const MAX_SPINS = 12;

/* ==========================================
   EASING
========================================== */

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/* ==========================================
   RESPONSIVE CANVAS CONFIG
========================================== */

const CANVAS_SIZE = Math.min(window.innerWidth * 0.9, 420);

const CENTER_X = CANVAS_SIZE / 2;
const CENTER_Y = CANVAS_SIZE / 2;

const RADIUS = CANVAS_SIZE * 0.42;

/* ==========================================
   SEGMENT COLORS
========================================== */

const SEGMENT_COLORS = ["#2563eb", "#38bdf8", "#1d4ed8", "#0ea5e9"];

/* ==========================================
   HIGH DPI SUPPORT
========================================== */

function setupCanvas() {
  const ratio = window.devicePixelRatio || 1;

  canvas.width = CANVAS_SIZE * ratio;

  canvas.height = CANVAS_SIZE * ratio;

  canvas.style.width = "100%";
  canvas.style.height = "auto";

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  drawWheel();
}

setupCanvas();

window.addEventListener("resize", setupCanvas);

/* ==========================================
   DRAW CENTER
========================================== */

function drawCenterCircle() {
  ctx.beginPath();

  ctx.arc(CENTER_X, CENTER_Y, 50, 0, Math.PI * 2);

  ctx.fillStyle = "#0f172a";

  ctx.fill();

  ctx.lineWidth = 4;

  ctx.strokeStyle = "#38bdf8";

  ctx.stroke();

  ctx.fillStyle = "#fff";

  ctx.font = "bold 16px Inter";

  ctx.textAlign = "center";

  ctx.textBaseline = "middle";

  ctx.fillText("PRAY", CENTER_X, CENTER_Y);
}

/* ==========================================
   DRAW SEGMENT
========================================== */

function drawSegment(startAngle, endAngle, color) {
  ctx.beginPath();

  ctx.moveTo(CENTER_X, CENTER_Y);

  ctx.arc(CENTER_X, CENTER_Y, RADIUS, startAngle, endAngle);

  ctx.closePath();

  ctx.fillStyle = color;

  ctx.fill();

  ctx.strokeStyle = "#0f172a";

  ctx.lineWidth = 2;

  ctx.stroke();
}

/* ==========================================
   DRAW TEXT
========================================== */

function drawSegmentText(text, angle) {
  ctx.save();

  ctx.translate(CENTER_X, CENTER_Y);

  ctx.rotate(angle);

  ctx.fillStyle = "#ffffff";

  const fontSize = state.remainingPool.length > 12 ? 10 : 13;

  ctx.font = `600 ${fontSize}px Inter`;

  ctx.textAlign = "right";

  ctx.textBaseline = "middle";

  ctx.fillText(text, RADIUS - 20, 0);

  ctx.restore();
}

/* ==========================================
   DRAW WHEEL
========================================== */

function drawWheel() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const names = state.remainingPool || [];

  if (names.length === 0) {
    drawEmptyWheel();

    return;
  }

  const arcSize = (Math.PI * 2) / names.length;

  ctx.save();

  ctx.translate(CENTER_X, CENTER_Y);

  ctx.rotate(currentRotation);

  /*
    يجعل أول قطاع يبدأ من أعلى
  */
  // ctx.rotate(-Math.PI / 2);

  ctx.translate(-CENTER_X, -CENTER_Y);

  names.forEach((name, index) => {
    const startAngle = index * arcSize;
    const endAngle = startAngle + arcSize;

    drawSegment(
      startAngle,
      endAngle,
      SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    );

    drawSegmentText(name, startAngle + arcSize / 2);
  });

  ctx.restore();

  drawCenterCircle();
}

/* ==========================================
   EMPTY WHEEL
========================================== */

function drawEmptyWheel() {
  ctx.beginPath();

  ctx.arc(CENTER_X, CENTER_Y, RADIUS, 0, Math.PI * 2);

  ctx.fillStyle = "#1e293b";

  ctx.fill();

  ctx.fillStyle = "#ffffff";

  ctx.font = "bold 20px Inter";

  ctx.textAlign = "center";

  ctx.textBaseline = "middle";

  ctx.fillText("Cycle Complete", CENTER_X, CENTER_Y);
}

/* ==========================================
   POINTER ANGLE
========================================== */

const POINTER_ANGLE = -Math.PI / 2;

/* ==========================================
   REDRAW
========================================== */

function refreshWheel() {
  requestAnimationFrame(drawWheel);
}

/* ==========================================
   CALCULATE TARGET ROTATION
========================================== */

function calculateTargetRotation(winnerIndex) {
  const total = state.remainingPool.length;

  const segmentAngle = (Math.PI * 2) / total;

  const winnerCenter = winnerIndex * segmentAngle;

  const currentAngle =
    ((currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  let delta = POINTER_ANGLE - winnerCenter - currentAngle;

  while (delta < 0) {
    delta += Math.PI * 2;
  }

  const extraSpins =
    (MIN_SPINS + Math.random() * (MAX_SPINS - MIN_SPINS)) * Math.PI * 2;

  return delta + extraSpins;
}

/* ==========================================
   ANIMATION LOOP
========================================== */

function animateSpin(startRotation, endRotation) {
  return new Promise((resolve) => {
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;

      const progress = Math.min(elapsed / SPIN_DURATION, 1);

      const eased = easeOutQuart(progress);

      currentRotation = startRotation + (endRotation - startRotation) * eased;

      refreshWheel();

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        currentRotation = currentRotation % (Math.PI * 2);

        refreshWheel();

        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

/* ==========================================
   BUTTON EVENT
========================================== */

spinBtn.addEventListener(
  "click",

  spinWheel,
);

/* ==========================================
   WINNER HANDLER PLACEHOLDER
==========================================
/* ==========================================
   FIREBASE TRANSACTION
========================================== */

async function handleWinner(winnerName) {
  const dayReference = getDayRef();

  try {
    const result = await runTransaction(
      dayReference,

      (currentData) => {
        if (currentData === null) {
          return currentData;
        }

        /*
            Someone else may have
            already consumed spins.
          */

        if (currentData.remainingSpins <= 0) {
          return currentData;
        }

        const pool = currentData.remainingPool || [];

        const winners = currentData.winners || [];

        /*
            Winner no longer exists
            because another client
            already picked him.
          */

        if (!pool.includes(winnerName)) {
          return currentData;
        }

        const updatedPool = pool.filter((person) => person !== winnerName);

        const updatedWinners = [...winners, winnerName];

        return {
          ...currentData,

          winners: updatedWinners,

          remainingPool: updatedPool,

          remainingSpins: currentData.remainingSpins - 1,

          lastUpdated: Date.now(),
        };
      },
    );

    if (!result.committed) {
      console.warn("Transaction not committed.");

      return;
    }

    const latest = result.snapshot.val();

    if (!latest) return;

    state = {
      winners: [],

      remainingPool: [],

      remainingSpins: 2,

      ...latest,
    };

    render();

    refreshWheel();
  } catch (error) {
    console.error("Transaction Error:", error);
  }
}

/* ==========================================
   VERIFY SPIN AVAILABILITY
========================================== */

function canSpin() {
  if (spinning) return false;

  if (state.remainingSpins <= 0) return false;

  if (state.remainingPool.length === 0) return false;

  return true;
}

/* ==========================================
   OVERRIDE SPIN LOGIC
========================================== */
function getWinnerFromWheel() {
  const total = state.remainingPool.length;

  const segmentAngle = (Math.PI * 2) / total;

  const normalizedRotation =
    ((currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  const pointerAngle =
    (POINTER_ANGLE - normalizedRotation + Math.PI * 2) % (Math.PI * 2);

  const rawIndex = pointerAngle / segmentAngle;

  const winnerIndex = Math.floor(rawIndex);

  return winnerIndex;
}

async function spinWheel() {
  if (!canSpin()) return;

  spinning = true;
  spinBtn.disabled = true;
  const startRotation = currentRotation;

  const endRotation =
    currentRotation +
    (8 + Math.random() * 4) * Math.PI * 2 +
    Math.random() * Math.PI * 2;

  await animateSpin(startRotation, endRotation);

  currentRotation =
    ((currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  const winnerIndex = getWinnerFromWheel();

  const winnerName = state.remainingPool[winnerIndex];

  await handleWinner(winnerName);

  spinning = false;
  spinBtn.disabled = false;
}

/* ==========================================
   REBIND BUTTON
========================================== */

spinBtn.replaceWith(spinBtn.cloneNode(true));

const newSpinBtn = document.getElementById("spinBtn");

newSpinBtn.addEventListener("click", spinWheel);

/* ==========================================
   LIVE UI LOCK
========================================== */

function updateSpinButton() {
  const disabled =
    spinning || state.remainingSpins <= 0 || state.remainingPool.length === 0;

  document.getElementById("spinBtn").disabled = disabled;
}

/* ==========================================
   PATCH RENDER
========================================== */

const originalRender = render;

render = function () {
  originalRender();

  // updateSpinButton();
};

addBtn.addEventListener("click", addPerson);

/* ==========================================
   ENTER KEY SUPPORT
========================================== */

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addPerson();
  }
});

/* ==========================================
   RESET TODAY
========================================== */

async function resetToday() {
  const dayReference = getDayRef();

  try {
    await runTransaction(
      dayReference,

      (currentData) => {
        if (!currentData) return currentData;

        const mergedPool = [
          ...(currentData.remainingPool || []),

          ...(currentData.winners || []),
        ];

        const uniquePool = [...new Set(mergedPool)];

        return {
          ...currentData,

          winners: [],

          remainingSpins: 2,

          remainingPool: uniquePool,

          lastUpdated: Date.now(),
        };
      },
    );
  } catch (error) {
    console.error("Reset Error:", error);
  }
}

resetBtn.addEventListener("click", resetToday);

/* ==========================================
   DAY CREATION
========================================== */

async function createFutureDay() {
  const currentDayKey = getCurrentDateKey();

  const currentSnapshot = await get(
    ref(db, `dailyPrayerWheel/${currentDayKey}`),
  );

  if (!currentSnapshot.exists()) {
    return;
  }

  const currentData = currentSnapshot.val();

  const nextDate = new Date();

  nextDate.setDate(nextDate.getDate() + simulatedDayOffset + 1);

  const nextKey = nextDate.toISOString().split("T")[0];

  const nextRef = ref(db, `dailyPrayerWheel/${nextKey}`);

  const nextSnap = await get(nextRef);

  if (nextSnap.exists()) {
    return nextKey;
  }

  await set(
    nextRef,

    {
      date: nextKey,

      remainingSpins: 2,

      winners: [],

      /*
        N-1 logic:
        only carry survivors
      */

      remainingPool: currentData.remainingPool || [],

      createdAt: Date.now(),
    },
  );

  return nextKey;
}

/* ==========================================
   FAST TEST DAY +1
========================================== */

async function moveToNextDay() {
  try {
    await createFutureDay();

    simulatedDayOffset++;

    await initializeCurrentDay();

    subscribeToCurrentDay();
  } catch (error) {
    console.error("Next Day Error:", error);
  }
}

nextDayBtn.addEventListener("click", moveToNextDay);

/* ==========================================
   CYCLE STATUS
========================================== */

function isCycleFinished() {
  return state.remainingPool.length === 0;
}

/* ==========================================
   CYCLE COMPLETE UI
========================================== */

function showCycleFinishedState() {
  wheelSection.classList.add("hidden");

  lockedSection.classList.remove("hidden");

  lockedSection.innerHTML = `

    <h2>
      🎉 Prayer Cycle Completed
    </h2>

    <p>

      Every brother and sister
      has now been prayed for.

      Start a new cycle using
      Reset Today.

    </p>

  `;
}

/* ==========================================
   PATCH VISIBILITY
========================================== */

const originalVisibility = updateVisibility;

updateVisibility = function () {
  if (isCycleFinished()) {
    showCycleFinishedState();

    return;
  }

  originalVisibility();
};
/* ==========================================
   TOAST SYSTEM
========================================== */

function showToast(message, type = "info") {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");

    toast.id = "toast";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.className = `toast ${type}`;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* ==========================================
   VALIDATION
========================================== */

function sanitizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function isValidName(name) {
  if (!name) return false;

  if (name.length < 2) return false;

  if (name.length > 40) return false;

  return true;
}

/* ==========================================
   OVERRIDE ADD PERSON
========================================== */

async function addPerson() {
  let name = sanitizeName(nameInput.value);

  if (!isValidName(name)) {
    showToast("Invalid name", "error");

    return;
  }

  try {
    await runTransaction(
      getDayRef(),

      (currentData) => {
        if (!currentData) return currentData;

        const pool = currentData.remainingPool || [];

        const winners = currentData.winners || [];

        const exists = pool.includes(name) || winners.includes(name);

        if (exists) return currentData;

        return {
          ...currentData,

          remainingPool: [...pool, name],
        };
      },
    );

    nameInput.value = "";

    showToast(`${name} added`, "success");
  } catch (error) {
    console.error(error);

    showToast("Failed to add person", "error");
  }
}

/* ==========================================
   LOADING STATE
========================================== */

function setLoading(loading) {
  spinBtn.disabled = loading;

  spinBtn.textContent = loading ? "Loading..." : "Spin The Prayer Wheel";
}

/* ==========================================
   RECOVERY
========================================== */

async function recoverState() {
  try {
    await initializeCurrentDay();

    subscribeToCurrentDay();
  } catch (error) {
    console.error(error);

    showToast(
      "Connection error",

      "error",
    );
  }
}

/* ==========================================
   SAFE WINNER CARDS
========================================== */

function renderWinners() {
  winnerList.innerHTML = "";

  const winners = state?.winners || [];

  if (winners.length === 0) {
    winnerList.innerHTML = `

      <div class="empty-winners">

        No one selected yet today.

      </div>

    `;

    return;
  }

  winners.forEach((name) => {
    const card = document.createElement("div");

    card.className = "winner-card";

    card.innerHTML = `

      <img
      loading="lazy"
      src="https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}"
      alt="${name}">

      <div class="winner-text">

        Let's keep <b>${name}</b> in our prayers today ❤️

      </div>

    `;

    winnerList.appendChild(card);
  });
}

/* ==========================================
   ONLINE STATUS
========================================== */

window.addEventListener("offline", () => {
  showToast("Offline", "error");
});
window.addEventListener("online", () => {
  showToast("Connected", "success");
});

/* ==========================================
   STARTUP
========================================== */

window.addEventListener("DOMContentLoaded", async () => {
  setLoading(true);
  await recoverState();
  setLoading(false);
  drawWheel();
});
