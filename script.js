const $ = (id) => document.getElementById(id);
const pages = {
  home: $("homePage"),
  game: $("gamePage"),
  report: $("reportPage")
};

// Seluruh gambar disimpan lokal di folder assets.
const allObjects = [
  { id: "bebek", name: "Bebek", src: "assets/bebek.png" },
  { id: "gajah", name: "Gajah", src: "assets/gajah.png" },
  { id: "jerapah", name: "Jerapah", src: "assets/jerapah.png" },
  { id: "katak", name: "Katak", src: "assets/katak.png" },
  { id: "ikan", name: "Ikan", src: "assets/ikan.png" },
  { id: "bus", name: "Bus", src: "assets/bus.png" },
  { id: "singa", name: "Singa", src: "assets/singa.png" },
  { id: "sepeda", name: "Sepeda", src: "assets/sepeda.png" },
  { id: "ambulance", name: "Ambulans", src: "assets/ambulance.png" },
  { id: "police", name: "Mobil Polisi", src: "assets/police.png" },
  { id: "kapal", name: "Kapal", src: "assets/kapal.png" },
  { id: "kursi", name: "Kursi", src: "assets/kursi.png" },
  { id: "bola", name: "Bola", src: "assets/bola.png" },
  { id: "boneka", name: "Boneka", src: "assets/boneka.png" },
  { id: "roket", name: "Roket", src: "assets/roket.png" },
  { id: "balon", name: "Balon", src: "assets/balon.png" },
  { id: "jam", name: "Jam", src: "assets/jam.png" },
  { id: "apel", name: "Apel", src: "assets/apel.png" },
  { id: "topi", name: "Topi", src: "assets/topi.png" },
  { id: "blueberry", name: "Blueberry", src: "assets/blueberry.png" },
  { id: "jeruk", name: "Jeruk", src: "assets/jeruk.png" },
  { id: "semangka", name: "Semangka", src: "assets/semangka.png" },
  { id: "kiwi", name: "Kiwi", src: "assets/kiwi.png" },
  { id: "buah-naga", name: "Buah Naga", src: "assets/buah naga.png" }
];

const state = {
  round: 0,
  score: 0,
  streak: 0,
  correct: 0,
  answers: [],
  current: null,
  phase: "memorize",
  timer: null,
  locked: false
};

const durations = [5,5,5,5,5,4,4,4,4,4,3,3,3,3,3];
let responseStartedAt = 0;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function stageFor(index) {
  return index < 5 ? 0 : index < 10 ? 1 : 2;
}

function objectCount(index) {
  return [4, 6, 8][stageFor(index)];
}

function stageTitle(stage) {
  return [
    "TAHAP 1 · 4 OBJEK",
    "TAHAP 2 · 6 OBJEK",
    "TAHAP 3 · 8 OBJEK"
  ][stage];
}

function showPage(name) {
  Object.entries(pages).forEach(([key, element]) => {
    element.classList.toggle("active", key === name);
  });
  if (name === "report") renderReport();
  window.scrollTo({top: 0, behavior: "smooth"});
}

$("startBtn").addEventListener("click", startGame);
$("restartBtn").addEventListener("click", startGame);
$("playAgainBtn").addEventListener("click", startGame);
$("printBtn").addEventListener("click", () => window.print());

function startGame() {
  clearInterval(state.timer);
  Object.assign(state, {
    round: 0,
    score: 0,
    streak: 0,
    correct: 0,
    answers: [],
    current: null,
    phase: "memorize",
    locked: false
  });
  showPage("game");
  beginRound();
}

function createChoices(objects, missing) {
  const distractors = shuffle(
    allObjects.filter(object => !objects.some(item => item.id === object.id))
  ).slice(0, 3);

  let choices = shuffle([missing, ...distractors]);

  // Pastikan urutan pilihan berbeda dari urutan objek yang ditampilkan.
  const choiceIds = new Set(choices.map(item => item.id));
  const visibleChoiceOrder = objects
    .filter(item => choiceIds.has(item.id))
    .map(item => item.id);

  let attempts = 0;
  while (
    choices.map(item => item.id).join("|") === visibleChoiceOrder.join("|") &&
    attempts < 10
  ) {
    choices = shuffle(choices);
    attempts++;
  }

  if (choices.map(item => item.id).join("|") === visibleChoiceOrder.join("|")) {
    choices.push(choices.shift());
  }

  return choices;
}

function beginRound() {
  clearInterval(state.timer);

  if (state.round >= 15) {
    finishGame();
    return;
  }

  state.locked = false;

  const stage = stageFor(state.round);
  const count = objectCount(state.round);

  // Ambil objek secara acak dari seluruh koleksi agar tiap ronde lebih bervariasi.
  const objects = shuffle(allObjects).slice(0, count);
  const missing = objects[Math.floor(Math.random() * objects.length)];
  const choices = createChoices(objects, missing);

  state.current = {objects, missing, choices, stage, count};
  state.phase = "memorize";

  $("stageLabel").textContent = stageTitle(stage);
  $("phaseLabel").textContent = "FASE 1 · AMATI";
  $("instruction").textContent = "Perhatikan semua gambar berikut dan ingat baik-baik.";
  $("answerArea").classList.add("hidden");
  $("nextBtn").classList.add("hidden");
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("timerCaption").textContent = "Waktu untuk mengamati";

  renderObjectGrid(objects);
  runTimer(durations[state.round], showQuestion);
}

function imageMarkup(object) {
  return `<img src="${object.src}" alt="${object.name}" draggable="false">`;
}

function renderObjectGrid(objects) {
  $("objectGrid").innerHTML = objects.map(object =>
    `<div class="object-tile">${imageMarkup(object)}</div>`
  ).join("");
}

function runTimer(seconds, done) {
  clearInterval(state.timer);
  let remaining = seconds;
  $("timerNumber").textContent = remaining;

  state.timer = setInterval(() => {
    remaining--;
    $("timerNumber").textContent = Math.max(0, remaining);

    if (remaining <= 0) {
      clearInterval(state.timer);
      done();
    }
  }, 1000);
}

function showQuestion() {
  responseStartedAt = performance.now();
  state.phase = "guess";

  $("phaseLabel").textContent = "FASE 2 · TEMUKAN";
  $("instruction").textContent = "Satu benda menghilang. Benda mana yang tadi kamu lihat?";
  $("timerCaption").textContent = "Pilih gambar yang hilang";
  $("timerNumber").textContent = "?";

  $("objectGrid").innerHTML = state.current.objects.map(object =>
    object.id === state.current.missing.id
      ? '<div class="object-tile missing-tile">?</div>'
      : `<div class="object-tile">${imageMarkup(object)}</div>`
  ).join("");

  $("answerArea").classList.remove("hidden");
  $("choiceGrid").innerHTML = state.current.choices.map(object =>
    `<button class="choice-btn" data-choice="${object.id}" aria-label="${object.name}">${imageMarkup(object)}</button>`
  ).join("");

  $("choiceGrid").querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => checkAnswer(button.dataset.choice, button));
  });
}

function checkAnswer(choice, button) {
  if (state.locked) return;
  state.locked = true;

  const elapsed = (performance.now() - responseStartedAt) / 1000;
  const correct = choice === state.current.missing.id;

  $("choiceGrid").querySelectorAll("button").forEach(option => {
    option.disabled = true;
    if (option.dataset.choice === state.current.missing.id) {
      option.classList.add("correct");
    }
  });

  if (correct) {
    state.correct++;
    state.streak++;
    const points = 100 + (state.streak - 1) * 10;
    state.score += points;
    $("feedback").textContent = `Tepat sekali! Kamu menemukan ${state.current.missing.name}. +${points} poin`;
    $("feedback").className = "feedback good";
  } else {
    state.streak = 0;
    button.classList.add("wrong");
    $("feedback").textContent = `Belum tepat. Benda yang hilang adalah ${state.current.missing.name}.`;
    $("feedback").className = "feedback bad";
  }

  state.answers.push({
    round: state.round + 1,
    stage: state.current.stage,
    correct,
    time: elapsed
  });

  $("nextBtn").classList.remove("hidden");
  $("nextBtn").textContent = state.round === 14
    ? "Lihat Rapor →"
    : "Ronde Berikutnya →";
}

$("nextBtn").addEventListener("click", () => {
  state.round++;
  beginRound();
});

function finishGame() {
  clearInterval(state.timer);
  showPage("report");
}

function renderReport() {
  const total = state.answers.length;
  const accuracy = total ? Math.round(state.correct / total * 100) : 0;
  const averageTime = total
    ? state.answers.reduce((sum, answer) => sum + answer.time, 0) / total
    : 0;

  $("finalScore").textContent = state.score;
  $("accuracy").textContent = total ? `${accuracy}%` : "—";
  $("correctCount").textContent = total ? `${state.correct}/${total}` : "—";
  $("avgTime").textContent = total ? `${averageTime.toFixed(1)} dtk` : "—";
  $("reportTitle").textContent = total ? "Kamu Hebat!" : "Rapor Permainan";
  $("reportMessage").textContent = total
    ? `Kamu menyelesaikan ${total} ronde. Terus berlatih dan tingkatkan kemampuanmu!`
    : "Selesaikan permainan untuk melihat hasilmu di sini.";

  if (!total) {
    $("stageResults").innerHTML =
      '<p class="empty-report">Belum ada data permainan. Selesaikan permainan untuk melihat laporan.</p>';
    return;
  }

  $("stageResults").innerHTML = [0, 1, 2].map(stage => {
    const items = state.answers.filter(answer => answer.stage === stage);
    const wins = items.filter(answer => answer.correct).length;
    const percentage = items.length ? Math.round(wins / items.length * 100) : 0;

    return `
      <article class="stage-result">
        <strong>${["Tahap 1 · 4 objek", "Tahap 2 · 6 objek", "Tahap 3 · 8 objek"][stage]}</strong>
        <p>${wins} benar dari ${items.length} ronde · Akurasi ${percentage}%</p>
      </article>
    `;
  }).join("");
}
