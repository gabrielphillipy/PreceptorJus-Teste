const landing = document.querySelector('[data-screen="landing"]');
const app = document.querySelector('[data-screen="app"]');
const pages = [...document.querySelectorAll("[data-page]")];
const navButtons = [...document.querySelectorAll(".app-nav button")];
const resultContent = document.querySelector("#resultContent");
const libraryGrid = document.querySelector("#libraryGrid");
const examResult = document.querySelector("#examResult");
const flashcardResult = document.querySelector("#flashcardResult");
const storageKey = "preceptorjus_workspace";
let lastSubmitter = null;
let lastStudy = null;
let currentExam = null;
let currentFlashcards = null;
let workspace = loadWorkspace();

initMotion();
renderWorkspace();

function openApp(route = "menu") {
  landing.classList.add("is-hidden");
  app.classList.remove("is-hidden");
  showRoute(route);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToSite() {
  app.classList.add("is-hidden");
  landing.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showRoute(route) {
  pages.forEach((page) => {
    const isActive = page.dataset.page === route;
    page.classList.toggle("is-hidden", !isActive);
    if (isActive) {
      page.style.animation = "none";
      page.offsetHeight;
      page.style.animation = "";
    }
  });

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });
}

function markdownToHtml(markdown) {
  const escaped = markdown
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return escaped
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      if (/^\d+\.\s/.test(line)) return `<p><strong>${line}</strong></p>`;
      if (!line.trim()) return "";
      return `<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("")
    .replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
}

function renderStudyDocument(markdown, meta = {}) {
  const lines = String(markdown || "").split("\n");
  const sections = [];
  let current = { title: meta.topic || "Estudo juridico", lines: [], intro: true };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      if (current.lines.length || !current.intro) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [], intro: false };
      return;
    }
    if (line.startsWith("### ")) {
      current.lines.push({ type: "subheading", text: line.slice(4).trim() });
      return;
    }
    current.lines.push({ type: "line", text: rawLine });
  });

  if (current.lines.length || !sections.length) sections.push(current);

  const body = sections
    .map((section, index) => renderStudySection(section, index, sections.length))
    .join("");

  return `
    <div class="study-document">
      <div class="study-cover">
        <span>${escapeHtml(meta.modeLabel || "Nota juridica")}</span>
        <h2>${escapeHtml(meta.topic || "Estudo juridico")}</h2>
        <p>Material organizado para leitura, revisao e treino. Confira fontes oficiais quando houver citacao normativa, jurisprudencial ou sumular.</p>
      </div>
      ${body}
    </div>
  `;
}

function renderStudySection(section, index, total) {
  const content = renderStudyLines(section.lines);
  if (!content.trim()) return "";

  const sectionNumber = String(index + 1).padStart(2, "0");
  return `
    <section class="study-section">
      <div class="section-heading">
        <span>${section.intro ? "Abertura" : `Secao ${sectionNumber}`}</span>
        <h2>${escapeHtml(section.title)}</h2>
        <small>${sectionNumber}/${String(total).padStart(2, "0")}</small>
      </div>
      <div class="section-body">${content}</div>
    </section>
  `;
}

function renderStudyLines(items) {
  let html = "";
  let list = [];

  const flushList = () => {
    if (!list.length) return;
    html += `<ul class="study-list">${list.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`;
    list = [];
  };

  items.forEach((item) => {
    if (item.type === "subheading") {
      flushList();
      html += `<h3>${escapeHtml(item.text)}</h3>`;
      return;
    }

    const line = String(item.text || "").trim();
    if (!line) {
      flushList();
      return;
    }

    const bullet = line.match(/^[\-\*\u2022]\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }

    flushList();
    const cleanLine = line.replace(/^\d+\.\s+/, "");
    const isLegalHighlight = /\b(art\.|artigo|codigo|lei|constituicao|sumula|stf|stj|jurisprudencia|precedente|tema)\b/i.test(cleanLine);
    html += `<p class="${isLegalHighlight ? "legal-highlight" : ""}">${formatInline(cleanLine)}</p>`;
  });

  flushList();
  return html;
}

function formatInline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\b(Art\.?\s*\d+[^\s,.]*)/gi, "<mark>$1</mark>")
    .replace(/\b(STF|STJ|OAB|CF|CPC|CPP|CC|CP)\b/g, "<mark>$1</mark>");
}

function loadWorkspace() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      studies: Array.isArray(parsed.studies) ? parsed.studies : [],
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
    };
  } catch {
    return { studies: [], exams: [] };
  }
}

function saveWorkspace() {
  localStorage.setItem(storageKey, JSON.stringify(workspace));
  renderWorkspace();
}

function renderWorkspace() {
  const studies = workspace.studies || [];
  const exams = workspace.exams || [];
  const totalAnswers = exams.reduce((sum, exam) => sum + Number(exam.total || 0), 0);
  const totalCorrect = exams.reduce((sum, exam) => sum + Number(exam.correct || 0), 0);
  const accuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  document.querySelectorAll('[data-stat="studies"]').forEach((item) => (item.textContent = studies.length));
  document.querySelectorAll('[data-stat="exams"]').forEach((item) => (item.textContent = exams.length));
  document.querySelectorAll('[data-stat="accuracy"]').forEach((item) => (item.textContent = `${accuracy}%`));

  const recentPanel = document.querySelector(".recent-panel .empty-state");
  if (recentPanel) {
    const latest = studies[0];
    recentPanel.innerHTML = latest
      ? `<strong>${escapeHtml(latest.topic)}</strong><span>${escapeHtml(latest.modeLabel || "Estudo juridico")} salvo em ${escapeHtml(latest.date)}.</span>`
      : `<strong>Seu arquivo esta pronto.</strong><span>Gere um estudo para salvar automaticamente.</span>`;
  }

  if (!libraryGrid) return;
  libraryGrid.querySelectorAll("[data-saved-study]").forEach((card) => card.remove());
  studies.slice(0, 12).forEach((study) => {
    const card = document.createElement("article");
    card.dataset.savedStudy = study.id;
    card.innerHTML = `
      <span>${escapeHtml(study.modeLabel || "Estudo")}</span>
      <h2>${escapeHtml(study.topic)}</h2>
      <p>${escapeHtml(study.excerpt || "Material salvo na biblioteca.")}</p>
      <button class="outline-button" type="button" data-open-study="${escapeHtmlAttr(study.id)}">Abrir</button>
    `;
    libraryGrid.prepend(card);
  });
}

function saveCurrentStudy() {
  if (!lastStudy?.topic || !lastStudy?.text) return false;
  const id = `study-${Date.now()}`;
  const study = {
    id,
    topic: lastStudy.topic,
    text: lastStudy.text,
    modeLabel: lastStudy.modeLabel || "Estudo juridico",
    excerpt: resultContent.textContent.trim().slice(0, 130),
    date: new Date().toLocaleDateString("pt-BR"),
  };
  workspace.studies = [study, ...workspace.studies.filter((item) => item.topic !== study.topic)].slice(0, 30);
  saveWorkspace();
  return true;
}

function exportResult() {
  if (!lastStudy?.text) return;
  window.print();
}

async function copyResult() {
  const text = resultContent.textContent.trim();
  if (!text) return;
  await navigator.clipboard?.writeText(text);
}

async function callAI(payload) {
  const controller = new AbortController();
  const timeoutMs = 55_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error && typeof error === "object" && error.name === "AbortError") {
      throw new Error("A geracao demorou demais e expirou. Tente novamente com menos secoes.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel gerar com IA.");
  }

  return data.text || "";
}

function setLoading(button, loading, label = "Gerando...") {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
    button.classList.add("is-loading");
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove("is-loading");
  }
}

function initMotion() {
  const animatedItems = [
    ...document.querySelectorAll(".section-head, .steps-grid article, .feature-copy, .feature-demo, .price-grid article, .feature-card, .tool-grid button, .recent-panel, .input-panel, .result-panel, .exam-card, .library-grid article, .chat-panel, .flashcard"),
  ];

  animatedItems.forEach((item) => item.classList.add("reveal-on-scroll"));

  if (!("IntersectionObserver" in window)) {
    animatedItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -40px 0px" },
  );

  animatedItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
    observer.observe(item);
  });
}

function renderError(container, error) {
  const message = error?.message ? String(error.message) : "Erro ao gerar.";
  const lower = message.toLowerCase();

  let title = "Nao foi possivel gerar agora";
  let hint = "Tente novamente em instantes.";

  if (lower.includes("alta demanda") || lower.includes("high demand") || lower.includes("overload")) {
    title = "IA em alta demanda";
    hint = "Isso costuma ser temporario. Aguarde alguns segundos e tente novamente. Se persistir, reduza o tema ou tente gerar em partes.";
  } else if (lower.includes("expirou") || lower.includes("timeout") || lower.includes("demorou demais")) {
    title = "Tempo limite excedido";
    hint = "Tente reduzir secoes/objetivos ou gerar novamente.";
  } else if (lower.includes("tema") && lower.includes("obrigatorio")) {
    title = "Tema obrigatorio";
    hint = "Preencha o campo Tema antes de gerar o estudo juridico.";
  } else if (lower.includes("google_api_key")) {
    title = "Chave de IA nao configurada";
    hint = "Configure a variavel GOOGLE_API_KEY no ambiente da Vercel.";
  }

  container.innerHTML = `
    <div class="error-state">
      <h2>${title}</h2>
      <p>${escapeHtml(message)}</p>
      <p>${escapeHtml(hint)}</p>
      <button class="outline-button" type="button" data-retry-last> tentar novamente </button>
    </div>
  `;
}

function renderValidationError(container, title, message) {
  container.innerHTML = `
    <div class="error-state validation-error">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderGenerationLoader(kind = "study") {
  const labels = {
    study: {
      title: "Redigindo nota juridica",
      subtitle: "A IA esta organizando fatos, fundamentos e pontos de prova.",
      steps: ["Delimitando o tema", "Buscando estrutura legal", "Montando tese", "Preparando revisao"],
    },
    exam: {
      title: "Montando simulado",
      subtitle: "Criando enunciado, alternativas e gabarito oculto.",
      steps: ["Criando caso", "Gerando alternativas", "Validando gabarito", "Separando feedback"],
    },
    flashcards: {
      title: "Criando flashcards",
      subtitle: "Transformando o tema em perguntas objetivas de revisao.",
      steps: ["Extraindo conceitos", "Criando frentes", "Redigindo versos", "Ordenando revisao"],
    },
  };

  const config = labels[kind] || labels.study;
  return `
    <div class="generation-loader">
      <div class="loader-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="loader-copy">
        <strong>${config.title}</strong>
        <p>${config.subtitle}</p>
      </div>
      <div class="loader-steps">
        ${config.steps.map((step, index) => `<span style="--i:${index}">${step}</span>`).join("")}
      </div>
      <div class="skeleton-stack" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

document.addEventListener("click", (event) => {
  const openAppButton = event.target.closest("[data-open-app]");
  if (openAppButton) {
    openApp("menu");
    return;
  }

  const backButton = event.target.closest("[data-back-site]");
  if (backButton) {
    backToSite();
    return;
  }

  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    if (routeButton.closest(".landing-view")) return;
    showRoute(routeButton.dataset.route);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const retryButton = event.target.closest("[data-retry-last]");
  if (retryButton && lastSubmitter) {
    lastSubmitter.click();
    return;
  }

  const reviewButton = event.target.closest("[data-review-errors]");
  if (reviewButton) {
    const review = document.querySelector("[data-exam-review]");
    review?.classList.toggle("is-hidden");
    reviewButton.textContent = review?.classList.contains("is-hidden") ? "Revisar questoes" : "Ocultar revisao";
    return;
  }

  const saveStudyButton = event.target.closest("[data-save-study]");
  if (saveStudyButton) {
    const saved = saveCurrentStudy();
    saveStudyButton.textContent = saved ? "Salvo" : "Nada para salvar";
    setTimeout(() => (saveStudyButton.textContent = "Salvar"), 1400);
    return;
  }

  const copyButton = event.target.closest("[data-copy-result]");
  if (copyButton) {
    copyResult().then(() => {
      copyButton.textContent = "Copiado";
      setTimeout(() => (copyButton.textContent = "Copiar"), 1400);
    });
    return;
  }

  const exportButton = event.target.closest("[data-export-result]");
  if (exportButton) {
    exportResult();
    return;
  }

  const openStudyButton = event.target.closest("[data-open-study]");
  if (openStudyButton) {
    const study = workspace.studies.find((item) => item.id === openStudyButton.dataset.openStudy);
    if (study) {
      lastStudy = study;
      resultContent.innerHTML = renderStudyDocument(study.text, study);
      document.querySelector("#topicInput").value = study.topic;
      showRoute("study");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  const generateExamFromStudyButton = event.target.closest("[data-generate-exam-from-study]");
  if (generateExamFromStudyButton) {
    generateExamFromStudy(generateExamFromStudyButton);
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll(".section-picker button").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("selected");
  });
});

document.querySelector("#topicInput").addEventListener("input", (event) => {
  if (event.currentTarget.value.trim()) {
    event.currentTarget.classList.remove("field-error");
  }
});

document.querySelector("#studyForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.currentTarget.querySelector(".generate-button");
  lastSubmitter = button;
  const topicInput = document.querySelector("#topicInput");
  const topic = topicInput.value.trim();
  if (!topic) {
    topicInput.classList.add("field-error");
    topicInput.focus();
    renderValidationError(resultContent, "Tema obrigatorio", "Preencha o campo Tema antes de gerar o estudo juridico.");
    return;
  }
  topicInput.classList.remove("field-error");
  const goals = document
    .querySelector("#goalsInput")
    .value.split("\n")
    .map((goal) => goal.trim())
    .filter(Boolean);
  const sections = [...document.querySelectorAll(".section-picker button.selected")].map((item) => item.textContent);
  const modeSelect = document.querySelector("#studyMode");
  const mode = modeSelect?.value || "fechamento";
  const modeLabel = modeSelect?.selectedOptions?.[0]?.textContent || "Estudo juridico";

  resultContent.innerHTML = renderGenerationLoader("study");
  setLoading(button, true);

  try {
    const text = await callAI({ mode, topic, goals, sections });
    lastStudy = { topic, text, modeLabel };
    resultContent.innerHTML = renderStudyDocument(text, lastStudy);
    saveCurrentStudy();
  } catch (error) {
    renderError(resultContent, error);
  } finally {
    setLoading(button, false);
  }
});

async function generateExamFromStudy(button) {
  if (!lastStudy?.topic) {
    renderValidationError(resultContent, "Gere um estudo primeiro", "Crie um estudo juridico antes de gerar a prova da materia.");
    return;
  }

  showRoute("exam");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const examForm = document.querySelector("#examForm");
  const input = examForm.querySelector("input");
  const submit = examForm.querySelector("button");
  const questionCount = Number(examForm.querySelector('[name="questionCount"]')?.value || 5);
  const difficulty = examForm.querySelector('[name="difficulty"]')?.value || "OAB";
  input.value = lastStudy.topic;
  examResult.innerHTML = renderGenerationLoader("exam");
  setLoading(button, true, "Gerando prova...");
  setLoading(submit, true);
  lastSubmitter = button;

  try {
    const text = await callAI({
      mode: "exam",
      topic: lastStudy.topic,
      context: lastStudy.text,
      questionCount,
      difficulty,
    });
    examResult.innerHTML = renderInteractiveExam(text, { topic: lastStudy.topic, difficulty });
  } catch (error) {
    renderError(examResult, error);
  } finally {
    setLoading(button, false);
    setLoading(submit, false);
  }
}

document.querySelector("#examForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  lastSubmitter = button;
  const topicInput = event.currentTarget.querySelector("input");
  const topic = topicInput.value.trim();
  if (!topic) {
    renderValidationError(examResult, "Tema obrigatorio", "Preencha o tema antes de gerar o simulado.");
    topicInput.focus();
    return;
  }
  const questionCount = Number(event.currentTarget.querySelector('[name="questionCount"]')?.value || 5);
  const difficulty = event.currentTarget.querySelector('[name="difficulty"]')?.value || "OAB";
  examResult.innerHTML = renderGenerationLoader("exam");
  setLoading(button, true);

  try {
    const text = await callAI({ mode: "exam", topic, questionCount, difficulty });
    examResult.innerHTML = renderInteractiveExam(text, { topic, difficulty });
  } catch (error) {
    renderError(examResult, error);
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#flashcardForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  lastSubmitter = button;
  const topicInput = event.currentTarget.querySelector("input");
  const topic = topicInput.value.trim();
  if (!topic) {
    renderValidationError(flashcardResult, "Tema obrigatorio", "Preencha o tema antes de gerar flashcards.");
    topicInput.focus();
    return;
  }
  flashcardResult.innerHTML = renderGenerationLoader("flashcards");
  setLoading(button, true);

  try {
    const text = await callAI({ mode: "flashcards", topic });
    flashcardResult.innerHTML = renderFlashcardDeck(text, topic);
  } catch (error) {
    renderError(flashcardResult, error);
  } finally {
    setLoading(button, false);
  }
});

function renderFlashcardDeck(markdown, topic) {
  const cards = parseFlashcards(markdown);
  if (!cards.length) {
    currentFlashcards = null;
    return markdownToHtml(markdown);
  }

  currentFlashcards = {
    topic,
    cards,
    index: 0,
    flipped: false,
  };
  return renderCurrentFlashcard();
}

function renderCurrentFlashcard() {
  if (!currentFlashcards?.cards?.length) return "";
  const { cards, index, flipped, topic } = currentFlashcards;
  const card = cards[index];
  const total = cards.length;
  const progress = Math.round(((index + 1) / total) * 100);
  const visibleText = flipped ? card.back : card.front;

  return `
    <div class="flashcard-deck">
      <div class="flashcard-deck-head">
        <div>
          <span>Baralho juridico</span>
          <h2>${escapeHtml(topic || "Flashcards")}</h2>
        </div>
        <small>${index + 1}/${total}</small>
      </div>
      <div class="exam-progress-track"><i style="width: ${progress}%"></i></div>
      <button class="flashcard-study ${flipped ? "is-flipped" : ""}" type="button" data-flip-card>
        <span>${flipped ? "Verso" : "Frente"}</span>
        <strong>${formatInline(visibleText)}</strong>
        <small>${flipped ? "Clique para voltar a pergunta" : "Clique para revelar a resposta"}</small>
      </button>
      <div class="flashcard-actions">
        <button type="button" data-prev-flashcard ${index === 0 ? "disabled" : ""}>Anterior</button>
        <button type="button" data-flip-card>${flipped ? "Ver frente" : "Virar card"}</button>
        <button type="button" data-next-flashcard ${index === total - 1 ? "disabled" : ""}>Proximo</button>
      </div>
    </div>
  `;
}

function parseFlashcards(markdown) {
  const lines = String(markdown || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim());
  const cards = [];
  let side = "";
  let front = [];
  let back = [];

  const pushCard = () => {
    const frontText = front.join(" ").replace(/^[:\-\s]+/, "").trim();
    const backText = back.join(" ").replace(/^[:\-\s]+/, "").trim();
    if (frontText && backText) {
      cards.push({ front: frontText, back: backText });
    }
    front = [];
    back = [];
    side = "";
  };

  lines.forEach((line) => {
    if (!line || /^-{3,}$/.test(line)) {
      if (front.length && back.length) pushCard();
      return;
    }

    const normalized = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
    if (/^frente\b/i.test(normalized)) {
      if (front.length && back.length) pushCard();
      side = "front";
      const rest = normalized.replace(/^frente\s*[:\-]?\s*/i, "").trim();
      if (rest) front.push(rest);
      return;
    }

    if (/^verso\b/i.test(normalized)) {
      side = "back";
      const rest = normalized.replace(/^verso\s*[:\-]?\s*/i, "").trim();
      if (rest) back.push(rest);
      return;
    }

    if (side === "front") front.push(line.replace(/^[-*]\s*/, ""));
    if (side === "back") back.push(line.replace(/^[-*]\s*/, ""));
  });

  if (front.length && back.length) pushCard();
  return cards.slice(0, 12);
}

document.addEventListener("click", (event) => {
  const flipButton = event.target.closest("[data-flip-card]");
  const nextFlashcard = event.target.closest("[data-next-flashcard]");
  const prevFlashcard = event.target.closest("[data-prev-flashcard]");
  if (currentFlashcards && (flipButton || nextFlashcard || prevFlashcard)) {
    if (flipButton) {
      currentFlashcards.flipped = !currentFlashcards.flipped;
    } else if (nextFlashcard) {
      currentFlashcards.index = Math.min(currentFlashcards.index + 1, currentFlashcards.cards.length - 1);
      currentFlashcards.flipped = false;
    } else {
      currentFlashcards.index = Math.max(currentFlashcards.index - 1, 0);
      currentFlashcards.flipped = false;
    }
    flashcardResult.innerHTML = renderCurrentFlashcard();
    return;
  }

  const button = event.target.closest("[data-answer]");
  if (!button) return;

  const container = button.closest(".exam-card");
  if (!container) return;

  const isCorrect = button.dataset.answer === "right";
  const selectedLetter = button.dataset.letter || "";
  let justification = button.dataset.justification || "";
  if (justification) {
    try {
      justification = decodeURIComponent(justification);
    } catch {
      // ignore
    }
  }

  container.querySelectorAll("[data-answer]").forEach((answer) => {
    const answerIsCorrect = answer.dataset.answer === "right";
    answer.classList.toggle("is-selected", answer === button);
    answer.classList.toggle("correct", answerIsCorrect);
    answer.classList.toggle("wrong", answer === button && !isCorrect);
  });

  const feedback = container.querySelector(".exam-feedback");
  if (feedback) {
    feedback.classList.remove("is-hidden");
    feedback.dataset.state = isCorrect ? "correct" : "wrong";
    const stateLabel = isCorrect ? "Certo" : "Errado";
    const title = feedback.querySelector("[data-feedback-title]");
    const body = feedback.querySelector("[data-feedback-body]");
    if (title) title.textContent = `${stateLabel} — alternativa ${selectedLetter}`;
    if (body) body.innerHTML = justification ? markdownToHtml(justification) : "<p>Sem justificativa.</p>";
  }

  if (currentExam) {
    currentExam.answers[currentExam.index] = selectedLetter;
    const nextButton = container.querySelector("[data-next-question], [data-finish-exam]");
    if (nextButton) nextButton.disabled = false;
  }
});

document.addEventListener("click", (event) => {
  const next = event.target.closest("[data-next-question]");
  const prev = event.target.closest("[data-prev-question]");
  const finish = event.target.closest("[data-finish-exam]");
  if (!currentExam || (!next && !prev && !finish)) return;

  if (finish) {
    finishExam();
    return;
  }

  if (next) {
    currentExam.index = Math.min(currentExam.index + 1, currentExam.questions.length - 1);
  } else {
    currentExam.index = Math.max(currentExam.index - 1, 0);
  }

  examResult.innerHTML = renderExamQuestion();
});

function renderInteractiveExam(markdown, meta = {}) {
  currentExam = parseExamPayload(markdown);
  if (!currentExam || !currentExam.questions.length) {
    return markdownToHtml(markdown);
  }
  currentExam.topic = meta.topic || "Simulado juridico";
  currentExam.difficulty = meta.difficulty || "OAB";

  return renderExamQuestion();
}

function renderExamQuestion() {
  if (!currentExam || !currentExam.questions.length) return "";

  const index = currentExam.index;
  const parsed = currentExam.questions[index];
  const selected = currentExam.answers[index] || "";
  const total = currentExam.questions.length;
  const progress = Math.round(((index + 1) / total) * 100);

  let html = `<div class="exam-session">
    <div class="exam-progress">
      <span>Questao ${index + 1} de ${total}</span>
      <div class="exam-progress-track"><i style="width: ${progress}%"></i></div>
    </div>
    <div class="exam-card">`;
  if (parsed.title) html += `<strong>${escapeHtml(parsed.title)}</strong>`;
  if (parsed.questionHtml) html += `<p>${parsed.questionHtml}</p>`;

  parsed.options.forEach((opt) => {
    const isCorrect = opt.letter === parsed.correctLetter;
    const encodedJustification = encodeURIComponent(opt.justification || parsed.comment || "");
    const isSelected = selected === opt.letter;
    const stateClass = selected
      ? `${isSelected ? "is-selected " : ""}${isCorrect ? "correct" : ""}${isSelected && !isCorrect ? "wrong" : ""}`
      : "";
    html += `<button type="button" class="${stateClass.trim()}" data-answer="${isCorrect ? "right" : "wrong"}" data-letter="${opt.letter}" data-justification="${escapeHtmlAttr(encodedJustification)}">${opt.html}</button>`;
  });

  const selectedOption = parsed.options.find((opt) => opt.letter === selected);
  const isCorrect = selected === parsed.correctLetter;
  const selectedJustification = selectedOption?.justification || parsed.comment || "";
  html += `<div class="exam-feedback ${selected ? "" : "is-hidden"}" data-state="${selected && !isCorrect ? "wrong" : "correct"}">
    <strong data-feedback-title>${selected ? `${isCorrect ? "Certo" : "Errado"} - alternativa ${escapeHtml(selected)}` : ""}</strong>
    <div class="exam-feedback-meta">
      <span><b>Gabarito:</b> ${escapeHtml(parsed.correctLetter)}</span>
    </div>
    <div data-feedback-body>${selected ? markdownToHtml(selectedJustification || "Sem justificativa.") : ""}</div>
  </div>`;

  html += `<div class="exam-controls">
      <button type="button" data-prev-question ${index === 0 ? "disabled" : ""}>Anterior</button>
      <button type="button" ${index === total - 1 ? "data-finish-exam" : "data-next-question"} ${!selected ? "disabled" : ""}>${index === total - 1 ? "Ver resultado" : "Proxima questao"}</button>
    </div>
  </div></div>`;
  return html;
}

function finishExam() {
  if (!currentExam) return;
  const correct = currentExam.questions.reduce((sum, question, index) => {
    return sum + (currentExam.answers[index] === question.correctLetter ? 1 : 0);
  }, 0);
  const total = currentExam.questions.length;
  const percent = Math.round((correct / total) * 100);
  workspace.exams = [
    {
      id: `exam-${Date.now()}`,
      topic: currentExam.topic,
      difficulty: currentExam.difficulty,
      correct,
      total,
      date: new Date().toLocaleDateString("pt-BR"),
    },
    ...workspace.exams,
  ].slice(0, 30);
  saveWorkspace();

  const review = currentExam.questions
    .map((question, index) => {
      const selected = currentExam.answers[index] || "-";
      const wrong = selected !== question.correctLetter;
      return `
        <article class="review-item ${wrong ? "wrong" : "correct"}">
          <strong>Questao ${index + 1}: ${wrong ? "revisar" : "correta"}</strong>
          <p>${question.questionHtml}</p>
          <span>Sua resposta: ${escapeHtml(selected)} | Gabarito: ${escapeHtml(question.correctLetter)}</span>
        </article>
      `;
    })
    .join("");

  examResult.innerHTML = `
    <div class="exam-summary">
      <span>Resultado do simulado</span>
      <h2>${correct} de ${total} acertos</h2>
      <div class="score-ring" style="--score:${percent}%">${percent}%</div>
      <p>${percent >= 70 ? "Bom desempenho. Foque em lapidar os detalhes." : "Vale revisar os pontos errados e refazer depois."}</p>
      <div class="exam-controls">
        <button type="button" data-route="exam">Novo simulado</button>
        <button type="button" data-review-errors>Revisar questoes</button>
      </div>
      <div class="exam-review is-hidden" data-exam-review>${review}</div>
    </div>
  `;
}

function parseExamPayload(markdown) {
  const json = extractExamJson(markdown);
  if (json?.questions?.length) {
    const questions = json.questions
      .map((question, index) => normalizeExamQuestion(question, index))
      .filter((question) => question.options.length >= 2 && question.correctLetter);

    if (questions.length) {
      return {
        index: 0,
        answers: Array.from({ length: questions.length }, () => ""),
        questions,
      };
    }
  }

  const parsed = parseExamMarkdown(markdown);
  if (!parsed || !parsed.options.length || !parsed.correctLetter) return null;

  return {
    index: 0,
    answers: [""],
    questions: [parsed],
  };
}

function extractExamJson(value) {
  const text = String(value || "").trim();
  const withoutFence = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  for (const candidate of [text, withoutFence, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function normalizeExamQuestion(question, index) {
  const rawOptions = Array.isArray(question.options) ? question.options : [];
  const rawJustifications = question.justifications && typeof question.justifications === "object"
    ? question.justifications
    : {};
  const justifications = Object.fromEntries(
    Object.entries(rawJustifications).map(([key, value]) => [String(key).toUpperCase(), value]),
  );
  const answerText = String(question.answer || question.correctLetter || "").trim().toUpperCase();
  const answer = answerText.match(/[A-E]/)?.[0] || "";

  const options = rawOptions.map((option, optionIndex) => {
    const optionData = option && typeof option === "object" ? option : { text: option };
    const letter = String(optionData.letter || "ABCDE"[optionIndex] || "").trim().slice(0, 1).toUpperCase();
    const text = String(optionData.text || optionData.content || optionData.answer || optionData || "").trim();
    return {
      letter,
      raw: `${letter}) ${text}`,
      html: `${escapeHtml(letter)}) ${escapeHtml(text)}`,
      justification: String(justifications[letter] || optionData.justification || "").trim(),
    };
  });

  return {
    title: `Questao ${index + 1}`,
    questionHtml: escapeHtml(String(question.statement || question.enunciado || question.question || "").trim())
      .replaceAll("\n", "<br><br>"),
    options,
    correctLetter: answer,
    comment: String(question.comment || question.explanation || "").trim(),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

function parseExamMarkdown(markdown) {
  const lines = String(markdown || "")
    .split("\n")
    .map((l) => l.trimEnd());

  let title = "";
  const questionLines = [];
  const options = [];
  let correctLetter = "";
  const commentLines = [];
  const justifications = new Map();

  let mode = "start";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      title = line.slice(3).trim();
      mode = "question";
      continue;
    }

    const optMatch = line.match(/^[\-\*\u2022]?\s*([A-E])\s*[\)\.\:\-]\s*(.+)$/i);
    if (optMatch && mode !== "justifications" && mode !== "comment" && !correctLetter) {
      mode = "options";
      const letter = optMatch[1].toUpperCase();
      const text = optMatch[2].trim();
      options.push({
        letter,
        raw: `${letter}) ${text}`,
        html: `${escapeHtml(letter)}) ${escapeHtml(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}`,
        justification: "",
      });
      continue;
    }

    const gabaritoLine = line.replace(/\*/g, "");
    const gabaritoMatch = gabaritoLine.match(/gabarito\s*:\s*([A-E])/i);
    if (gabaritoMatch) {
      correctLetter = String(gabaritoMatch[1]).toUpperCase();
      mode = "after_answer";
      continue;
    }

    if (/^\*?\*?Coment[aá]rio:\*?\*?/i.test(line)) {
      mode = "comment";
      const rest = line.replace(/^\*?\*?Coment[aá]rio:\*?\*?\s*/i, "").trim();
      if (rest) commentLines.push(rest);
      continue;
    }

    if (/^\*+?\s*Justificativas:\s*\*+?/i.test(line) || /^Justificativas:/i.test(line)) {
      mode = "justifications";
      continue;
    }

    if (mode === "justifications") {
      const normalized = line.replace(/^\-\s*/, "").replace(/\*/g, "");
      const jMatch = normalized.match(/^(?:Justificativa\s*)?([A-E])\s*[:\-]\s*(.+)$/i);
      if (jMatch) {
        justifications.set(jMatch[1].toUpperCase(), jMatch[2].trim());
      }
      continue;
    }

    if (mode === "question") {
      questionLines.push(line.replace(/^Enunciado\s*:\s*/i, ""));
      continue;
    }

    if (mode === "comment") {
      commentLines.push(line);
      continue;
    }
  }

  options.forEach((opt) => {
    const j = justifications.get(opt.letter);
    if (j) opt.justification = j;
  });

  return {
    title,
    questionHtml: escapeHtml(questionLines.join("\n"))
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replaceAll("\n", "<br><br>"),
    options,
    correctLetter,
    comment: commentLines.join("\n").trim(),
  };
}

document.querySelector("#chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const submit = event.currentTarget.querySelector("button");
  const value = input.value.trim();
  if (!value) return;

  const user = document.createElement("div");
  user.className = "message user";
  user.textContent = value;
  event.currentTarget.before(user);
  input.value = "";
  setLoading(submit, true, "...");

  const assistant = document.createElement("div");
  assistant.className = "message assistant";
  assistant.textContent = "Pensando juridicamente...";
  event.currentTarget.before(assistant);

  try {
    const context = resultContent.textContent || "";
    assistant.innerHTML = markdownToHtml(await callAI({ mode: "chat", message: value, context }));
  } catch (error) {
    assistant.innerHTML = `Nao consegui responder agora. ${error.message}`;
  } finally {
    setLoading(submit, false);
  }
});
