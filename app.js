const STORAGE_KEY = "trac-nghiem-practice-state-v1";

const state = {
  questions: [],
  currentIndex: 0,
  answers: {},
  lastRenderedQuestionId: null,
};

const elements = {
  totalCount: document.getElementById("total-count"),
  answeredCount: document.getElementById("answered-count"),
  correctCount: document.getElementById("correct-count"),
  remainingCount: document.getElementById("remaining-count"),
  progressHeading: document.getElementById("progress-heading"),
  accuracyPill: document.getElementById("accuracy-pill"),
  progressFill: document.getElementById("progress-fill"),
  messageBox: document.getElementById("message-box"),
  questionCard: document.getElementById("question-card"),
  questionCounter: document.getElementById("question-counter"),
  questionSourceId: document.getElementById("question-source-id"),
  questionText: document.getElementById("question-text"),
  optionList: document.getElementById("option-list"),
  questionFeedback: document.getElementById("question-feedback"),
  prevQuestion: document.getElementById("prev-question"),
  nextQuestion: document.getElementById("next-question"),
  resetProgress: document.getElementById("reset-progress"),
  jumpRandom: document.getElementById("jump-random"),
  questionPalette: document.getElementById("question-palette"),
  paletteCaption: document.getElementById("palette-caption"),
  completionCard: document.getElementById("completion-card"),
  optionTemplate: document.getElementById("option-template"),
};

function showMessage(text, tone = "info") {
  elements.messageBox.className = `message-box is-${tone}`;
  elements.messageBox.textContent = text;
}

function loadSavedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const saved = JSON.parse(raw);
    const validAnswers = {};

    for (const question of state.questions) {
      const answer = saved.answers?.[question.id];
      if (question.options.some((option) => option.id === answer)) {
        validAnswers[question.id] = answer;
      }
    }

    state.answers = validAnswers;

    if (Number.isInteger(saved.currentIndex)) {
      state.currentIndex = clamp(saved.currentIndex, 0, state.questions.length - 1);
    }
  } catch {
    state.answers = {};
    state.currentIndex = 0;
  }
}

function saveState() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentIndex: state.currentIndex,
      answers: state.answers,
    })
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCurrentQuestion() {
  return state.questions[state.currentIndex];
}

function getStats() {
  const total = state.questions.length;
  let answered = 0;
  let correct = 0;

  for (const question of state.questions) {
    const selected = state.answers[question.id];
    if (!selected) {
      continue;
    }

    answered += 1;
    if (selected === question.correctAnswer) {
      correct += 1;
    }
  }

  return {
    total,
    answered,
    correct,
    remaining: total - answered,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
  };
}

function selectAnswer(optionId) {
  const question = getCurrentQuestion();
  state.answers[question.id] = optionId;
  saveState();
  render();
}

function goToQuestion(index) {
  state.currentIndex = clamp(index, 0, state.questions.length - 1);
  saveState();
  render();
}

function goToRandomQuestion() {
  if (!state.questions.length) {
    return;
  }

  let nextIndex = state.currentIndex;
  while (state.questions.length > 1 && nextIndex === state.currentIndex) {
    nextIndex = Math.floor(Math.random() * state.questions.length);
  }
  goToQuestion(nextIndex);
}

function resetProgress() {
  const confirmed = window.confirm("Xóa toàn bộ tiến độ làm bài hiện tại?");
  if (!confirmed) {
    return;
  }

  state.answers = {};
  state.currentIndex = 0;
  state.lastRenderedQuestionId = null;
  window.localStorage.removeItem(STORAGE_KEY);
  render();
}

function buildFeedback(question) {
  const selected = state.answers[question.id];
  if (!selected) {
    return {
      text: "Chọn một đáp án để xem phản hồi ngay.",
      tone: "",
    };
  }

  if (selected === question.correctAnswer) {
    return {
      text: `Bạn chọn ${selected.toUpperCase()}. Chính xác.`,
      tone: "is-correct",
    };
  }

  return {
    text: `Bạn chọn ${selected.toUpperCase()}. Đáp án đúng là ${question.correctAnswer.toUpperCase()}.`,
    tone: "is-wrong",
  };
}

function renderStats() {
  const stats = getStats();

  elements.totalCount.textContent = String(stats.total);
  elements.answeredCount.textContent = String(stats.answered);
  elements.correctCount.textContent = String(stats.correct);
  elements.remainingCount.textContent = String(stats.remaining);
  elements.progressHeading.textContent = `Đã làm ${stats.answered} / ${stats.total} câu`;
  elements.accuracyPill.textContent = `${stats.accuracy}% chính xác`;
  elements.progressFill.style.width = `${stats.total ? (stats.answered / stats.total) * 100 : 0}%`;
  elements.paletteCaption.textContent = `${stats.total} câu`;

  if (stats.answered === 0) {
    showMessage("Dữ liệu đã sẵn sàng. Chọn một câu để bắt đầu.", "info");
  } else if (stats.answered < stats.total) {
    showMessage(`Bạn còn ${stats.remaining} câu chưa làm.`, "info");
  } else {
    showMessage("Bạn đã hoàn thành toàn bộ bộ đề.", "info");
  }
}

function renderQuestion() {
  const question = getCurrentQuestion();
  const selected = state.answers[question.id];

  if (state.lastRenderedQuestionId !== question.id) {
    elements.questionCard.classList.remove("is-animating");
    void elements.questionCard.offsetWidth;
    elements.questionCard.classList.add("is-animating");
    state.lastRenderedQuestionId = question.id;
  }

  elements.questionCounter.textContent = `Câu ${state.currentIndex + 1} / ${state.questions.length}`;
  elements.questionSourceId.textContent = `Mã gốc: ${question.id}`;
  elements.questionText.textContent = question.question;
  elements.optionList.innerHTML = "";

  for (const option of question.options) {
    const optionNode = elements.optionTemplate.content.firstElementChild.cloneNode(true);
    const isSelected = selected === option.id;
    const isCorrect = option.id === question.correctAnswer;

    optionNode.querySelector(".option-letter").textContent = option.id.toUpperCase();
    optionNode.querySelector(".option-copy").textContent = option.text;
    optionNode.setAttribute("aria-pressed", String(isSelected));

    if (selected) {
      if (isCorrect) {
        optionNode.classList.add("is-correct");
      }
      if (isSelected && !isCorrect) {
        optionNode.classList.add("is-selected", "is-wrong");
      } else if (isSelected) {
        optionNode.classList.add("is-selected");
      }
    }

    optionNode.addEventListener("click", () => selectAnswer(option.id));
    elements.optionList.appendChild(optionNode);
  }

  const feedback = buildFeedback(question);
  elements.questionFeedback.textContent = feedback.text;
  elements.questionFeedback.className = `question-feedback ${feedback.tone}`.trim();

  elements.prevQuestion.disabled = state.currentIndex === 0;
  elements.nextQuestion.disabled = state.currentIndex === state.questions.length - 1;
}

function renderPalette() {
  elements.questionPalette.innerHTML = "";

  for (const [index, question] of state.questions.entries()) {
    const button = document.createElement("button");
    const selected = state.answers[question.id];
    const isCorrect = selected && selected === question.correctAnswer;
    const isWrong = selected && selected !== question.correctAnswer;

    button.type = "button";
    button.className = "palette-button";
    button.textContent = String(question.id);
    button.title = `Câu gốc ${question.id}`;

    if (index === state.currentIndex) {
      button.classList.add("is-current");
    }
    if (isCorrect) {
      button.classList.add("is-correct");
    }
    if (isWrong) {
      button.classList.add("is-wrong");
    }

    button.addEventListener("click", () => goToQuestion(index));
    elements.questionPalette.appendChild(button);
  }
}

function renderCompletionCard() {
  const stats = getStats();
  const completed = stats.answered === stats.total;

  if (!completed) {
    elements.completionCard.innerHTML = `
      <p class="panel-kicker">Kết quả</p>
      <h2>Chưa hoàn thành</h2>
      <p>Bạn đã làm <strong>${stats.answered}</strong> / <strong>${stats.total}</strong> câu.</p>
      <p>Tạm thời đúng <strong>${stats.correct}</strong> câu, còn <strong>${stats.remaining}</strong> câu chưa làm.</p>
    `;
    return;
  }

  elements.completionCard.innerHTML = `
    <p class="panel-kicker">Kết quả</p>
    <h2>Hoàn thành bộ đề</h2>
    <p>Bạn trả lời đúng <strong>${stats.correct}</strong> / <strong>${stats.total}</strong> câu.</p>
    <p>Độ chính xác hiện tại là <strong>${stats.accuracy}%</strong>. Bạn có thể bấm “Làm lại” để luyện lại từ đầu.</p>
  `;
}

function render() {
  if (!state.questions.length) {
    return;
  }

  renderStats();
  renderQuestion();
  renderPalette();
  renderCompletionCard();
}

function handleKeydown(event) {
  if (!state.questions.length || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();
  const question = getCurrentQuestion();

  if (key === "arrowleft") {
    event.preventDefault();
    goToQuestion(state.currentIndex - 1);
    return;
  }

  if (key === "arrowright") {
    event.preventDefault();
    goToQuestion(state.currentIndex + 1);
    return;
  }

  const optionMap = ["a", "b", "c", "d", "e", "f"];
  const numericIndex = Number.parseInt(key, 10);

  if (optionMap.includes(key) && question.options.some((option) => option.id === key)) {
    event.preventDefault();
    selectAnswer(key);
    return;
  }

  if (
    Number.isInteger(numericIndex) &&
    numericIndex >= 1 &&
    numericIndex <= question.options.length
  ) {
    event.preventDefault();
    selectAnswer(optionMap[numericIndex - 1]);
  }
}

async function loadQuestions() {
  try {
    const data = window.QUIZ_DATA;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Dữ liệu câu hỏi rỗng hoặc sai định dạng.");
    }

    state.questions = data;
    loadSavedState();
    render();
  } catch (error) {
    showMessage(error.message, "error");
    elements.questionText.textContent = "Không tải được bộ đề.";
    elements.questionFeedback.textContent = "Kiểm tra lại file dữ liệu quiz-data.js.";
  }
}

function bindEvents() {
  elements.prevQuestion.addEventListener("click", () => goToQuestion(state.currentIndex - 1));
  elements.nextQuestion.addEventListener("click", () => goToQuestion(state.currentIndex + 1));
  elements.resetProgress.addEventListener("click", resetProgress);
  elements.jumpRandom.addEventListener("click", goToRandomQuestion);
  document.addEventListener("keydown", handleKeydown);
}

bindEvents();
loadQuestions();
