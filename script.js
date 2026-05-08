const landing = document.querySelector('[data-screen="landing"]');
const app = document.querySelector('[data-screen="app"]');
const pages = [...document.querySelectorAll("[data-page]")];
const navButtons = [...document.querySelectorAll(".app-nav button")];
const resultContent = document.querySelector("#resultContent");
const libraryGrid = document.querySelector("#libraryGrid");
const examResult = document.querySelector("#examResult");
const flashcardResult = document.querySelector("#flashcardResult");
const storageKey = "preceptorjus_workspace";
const themeKey = "preceptorjus_theme";
let lastSubmitter = null;
let lastStudy = null;
let currentExam = null;
let currentFlashcards = null;
let libraryQuery = "";
let libraryFilter = "all";
let workspace = loadWorkspace();

initTheme();
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
  const sections = parseStudySections(markdown, meta);
  if (isMindMapMode(meta)) {
    return renderMindMapDocument(sections, meta);
  }

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

function isMindMapMode(meta = {}) {
  return /mapa/i.test(String(meta.mode || "")) || /mapa mental/i.test(String(meta.modeLabel || ""));
}

function renderMindMapDocument(sections, meta = {}) {
  const topic = meta.topic || "Mapa mental juridico";
  const model = buildMindMapModel(sections, meta);
  return `
    <div class="mindmap-document">
      <div class="mindmap-header">
        <span>Mapa mental</span>
        <h2>${escapeHtml(topic)}</h2>
        <p>Ramos de revisao rapida para conectar conceito, base legal, requisitos e pontos de prova.</p>
      </div>
      <div class="mindmap-canvas">
        <div class="mindmap-map">
          <div class="mindmap-core">
            <small>Nucleo</small>
            <strong>${formatInline(model.centralText)}</strong>
          </div>
          ${model.branches.map((branch, index) => renderMindMapBranch(branch, index, model.branches.length)).join("")}
        </div>
      </div>
    </div>
  `;
}

function buildMindMapModel(sections, meta = {}) {
  const topic = meta.topic || "Mapa mental juridico";
  const central = sections.find((section) => /n[uú]cleo|central|tema/i.test(section.title)) || sections[0];
  const centralLines = getSectionPlainLines(central).filter((line) => !/^mapa mental/i.test(line));
  const centralCandidate = compactMindMapText(centralLines[0] || "", 40);
  const centralText = centralCandidate && centralCandidate.length <= 32 ? centralCandidate : compactMindMapText(topic, 32);
  let branches = sections.filter((section) => section !== central && getSectionPlainLines(section).length);
  if (branches.length < 2) {
    branches = buildMindMapFallbackBranches(sections, central);
  }

  return {
    topic,
    centralText,
    branches: branches.slice(0, 6).map((section, index) => normalizeMindMapBranch(section, index)),
  };
}

function normalizeMindMapBranch(section, index) {
  const title = compactMindMapTitle(section.title || inferMindMapBranchTitle(index), index);
  const seen = new Set();
  const points = getSectionPlainLines(section)
    .map((line) => compactMindMapText(line, 48))
    .filter((line) => {
      const key = line.toLowerCase();
      if (!key || seen.has(key) || key === title.toLowerCase()) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);

  return { title, points, index };
}

function compactMindMapTitle(value, index = 0) {
  const clean = String(value || "")
    .replace(/^Ramo\s*\d+\s*[:\-]\s*/i, "")
    .replace(/\*\*/g, "")
    .trim();
  return compactMindMapText(clean || inferMindMapBranchTitle(index), 18);
}

function compactMindMapText(value, maxLength = 64) {
  let clean = String(value || "")
    .replace(/\*\*/g, "")
    .replace(/^[-*\u2022]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  const colon = clean.indexOf(":");
  if (colon > -1 && colon < 34) {
    const label = clean.slice(0, colon + 1);
    const rest = clean.slice(colon + 1).trim();
    clean = `${label} ${rest.split(/[.;]/)[0] || rest}`;
  } else {
    clean = clean.split(/[.;]/)[0] || clean;
  }

  if (clean.length <= maxLength) return clean;
  const clipped = clean.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 28 ? lastSpace : maxLength).trim()}...`;
}

function buildMindMapFallbackBranches(sections, central) {
  const sourceSections = sections.filter((section) => section !== central);
  const candidates = sourceSections.length ? sourceSections : sections;
  const branches = [];

  candidates.forEach((section) => {
    const plain = getSectionPlainLines(section);
    if (!plain.length) return;

    if (!/n[uú]cleo|central|tema/i.test(section.title) && section.title) {
      branches.push({ title: section.title, lines: plain.map((text) => ({ type: "line", text })) });
      return;
    }

    let current = null;
    plain.forEach((line) => {
      const titleMatch = line.match(/^(?:ramo\s*\d+\s*[:\-]\s*)?([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^:]{2,48})\s*:\s*(.*)$/i);
      if (titleMatch) {
        if (current?.lines.length) branches.push(current);
        current = { title: titleMatch[1].trim(), lines: [] };
        if (titleMatch[2]) current.lines.push({ type: "line", text: titleMatch[2].trim() });
        return;
      }

      if (!current) {
        current = { title: inferMindMapBranchTitle(branches.length), lines: [] };
      }
      current.lines.push({ type: "line", text: line });
    });

    if (current?.lines.length) branches.push(current);
  });

  if (branches.length >= 2) return branches;

  const allLines = sections.flatMap(getSectionPlainLines).filter((line) => !/n[uú]cleo|central/i.test(line));
  return chunkArray(allLines, 4).map((group, index) => ({
    title: inferMindMapBranchTitle(index),
    lines: group.map((text) => ({ type: "line", text })),
  }));
}

function inferMindMapBranchTitle(index) {
  return ["Conceito", "Base legal", "Requisitos", "Prova", "Excecoes", "Revisao"][index] || `Ramo ${index + 1}`;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getSectionPlainLines(section) {
  if (!section) return [];
  return section.lines
    .map((item) => (item.type === "subheading" ? item.text : String(item.text || "")))
    .map((line) => line.trim().replace(/^[\-\*\u2022]\s+/, ""))
    .filter(Boolean);
}

function renderMindMapBranch(branch, position, total) {
  const angle = total > 1 ? -150 + (300 / (total - 1)) * position : 0;
  const radius = position % 2 ? 244 : 214;
  return `
    <article class="mindmap-branch" style="--angle:${angle}deg; --radius:${radius}px;">
      <div class="mindmap-node-title">
        <span>${String(branch.index + 1).padStart(2, "0")}</span>
        <h3>${escapeHtml(branch.title)}</h3>
      </div>
      <ul>
        ${branch.points.map((point) => `<li>${formatInline(point)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function parseStudySections(markdown, meta = {}) {
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
  return sections;
}

function renderFormalPdfDocument(markdown, meta = {}) {
  if (isMindMapMode(meta)) {
    return renderMindMapPdfDocument(markdown, meta);
  }

  const sections = parseStudySections(markdown, meta).filter((section) => {
    return section.lines.some((item) => String(item.text || "").trim());
  });
  const date = new Date().toLocaleDateString("pt-BR");
  const topic = meta.topic || "Estudo juridico";

  return `
    <article class="formal-pdf">
      <section class="formal-cover">
        <div class="formal-brand">
          <span>PJ</span>
          <strong>PreceptorJus</strong>
        </div>
        <p>${escapeHtml(meta.modeLabel || "Material academico juridico")}</p>
        <h1>${escapeHtml(topic)}</h1>
        <div class="formal-meta">
          <span>Documento de estudo</span>
          <span>Gerado em ${escapeHtml(date)}</span>
          <span>Conferencia de fontes recomendada</span>
        </div>
      </section>

      <section class="formal-summary">
        <h2>Sumario</h2>
        <ol>
          ${sections.map((section) => `<li>${escapeHtml(section.title)}</li>`).join("")}
        </ol>
      </section>

      ${sections.map((section, index) => renderFormalPdfSection(section, index)).join("")}

      <footer class="formal-footer">
        <strong>PreceptorJus</strong>
        <span>Conteudo para fins academicos. Confira a legislacao, jurisprudencia e fontes oficiais aplicaveis.</span>
      </footer>
    </article>
  `;
}

function renderMindMapPdfDocument(markdown, meta = {}) {
  const sections = parseStudySections(markdown, meta).filter((section) => {
    return section.lines.some((item) => String(item.text || "").trim());
  });
  const model = buildMindMapModel(sections, meta);
  const date = new Date().toLocaleDateString("pt-BR");
  const leftBranches = model.branches.filter((_, index) => index % 2 === 0);
  const rightBranches = model.branches.filter((_, index) => index % 2 === 1);

  return `
    <article class="formal-pdf formal-pdf-map">
      <section class="formal-cover compact">
        <div class="formal-brand">
          <span>PJ</span>
          <strong>PreceptorJus</strong>
        </div>
        <p>Mapa mental juridico</p>
        <h1>${escapeHtml(model.topic)}</h1>
        <div class="formal-meta">
          <span>Documento visual de revisao</span>
          <span>Gerado em ${escapeHtml(date)}</span>
          <span>Conferencia de fontes recomendada</span>
        </div>
      </section>

      <section class="formal-map-sheet">
        <div class="formal-map-diagram">
          <div class="formal-map-branches left">
            ${leftBranches.map((branch, index) => renderFormalMindMapBranch(branch, index)).join("")}
          </div>
          <div class="formal-map-core">
            <span>Nucleo</span>
            <strong>${formatInline(model.centralText)}</strong>
          </div>
          <div class="formal-map-branches right">
            ${rightBranches.map((branch, index) => renderFormalMindMapBranch(branch, index)).join("")}
          </div>
        </div>
      </section>

      <footer class="formal-footer">
        <strong>PreceptorJus</strong>
        <span>Mapa mental para revisao academica. Confira artigos, sumulas e precedentes nas fontes oficiais.</span>
      </footer>
    </article>
  `;
}

function renderFormalMindMapBranch(branch, index) {
  const normalized = branch.points ? branch : normalizeMindMapBranch(branch, index);

  return `
    <article class="formal-map-branch">
      <header>
        <span>${String((normalized.index ?? index) + 1).padStart(2, "0")}</span>
        <h2>${escapeHtml(normalized.title)}</h2>
      </header>
      <ul>
        ${normalized.points.map((point) => `<li>${formatInline(point)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function renderFormalPdfSection(section, index) {
  const isQuestionSection = /quest|fixa|prova|simulado|treino|banca/i.test(section.title);
  const content = isQuestionSection ? renderFormalPdfQuestions(section.lines) : renderFormalPdfLines(section.lines);
  if (!content.trim()) return "";

  return `
    <section class="formal-section">
      <header>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <h2>${escapeHtml(section.title)}</h2>
      </header>
      ${content}
    </section>
  `;
}

function renderFormalPdfLines(items) {
  let html = "";
  let list = [];

  const flushList = () => {
    if (!list.length) return;
    html += `<ul>${list.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`;
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
    html += `<p>${formatInline(line.replace(/^\d+\.\s+/, ""))}</p>`;
  });

  flushList();
  return html;
}

function renderFormalPdfQuestions(items) {
  const visual = renderStudyQuestions(items);
  return visual
    .replaceAll("study-question-set", "formal-question-set")
    .replaceAll("study-question-card", "formal-question")
    .replaceAll("study-question-badge", "formal-question-badge")
    .replaceAll("study-question-stem", "formal-question-stem")
    .replaceAll("study-question-options", "formal-question-options")
    .replaceAll("study-question-feedback", "formal-question-feedback");
}

function renderStudySection(section, index, total) {
  const isQuestionSection = /quest|fixa|prova|simulado|treino|banca/i.test(section.title);
  const content = isQuestionSection ? renderStudyQuestions(section.lines) : renderStudyLines(section.lines);
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

function renderStudyQuestions(items) {
  const lines = items
    .map((item) => (item.type === "subheading" ? `### ${item.text}` : String(item.text || "")))
    .map((line) => line.trim())
    .filter(Boolean);
  const questions = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.stem.length || current.options.length || current.comment.length) {
      questions.push(current);
    }
    current = null;
  };

  lines.forEach((line) => {
    const clean = line.replace(/\*\*/g, "").trim();
    const questionMatch = clean.match(/^(?:quest[aã]o\s*)?(\d+)[\)\.\:\-]\s*(.+)$/i);
    const headingQuestion = clean.match(/^#+\s*(?:quest[aã]o\s*)?(\d+)[\)\.\:\-]?\s*(.*)$/i);
    const optionMatch = clean.match(/^[\-\*\u2022]?\s*([A-E])\s*[\)\.\:\-]\s*(.+)$/i);
    const answerMatch = clean.match(/^(?:gabarito|resposta)\s*[:\-]\s*([A-E])(?:\s*[-–—]\s*(.+))?$/i);
    const commentMatch = clean.match(/^(?:coment[aá]rio|justificativa|explica[cç][aã]o)\s*[:\-]\s*(.+)$/i);

    if (questionMatch || headingQuestion) {
      pushCurrent();
      const match = questionMatch || headingQuestion;
      current = {
        number: match[1],
        stem: match[2] ? [match[2]] : [],
        options: [],
        answer: "",
        comment: [],
      };
      return;
    }

    if (!current) {
      current = { number: String(questions.length + 1), stem: [], options: [], answer: "", comment: [] };
    }

    if (optionMatch) {
      current.options.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2] });
      return;
    }

    if (answerMatch) {
      current.answer = answerMatch[1].toUpperCase();
      if (answerMatch[2]) current.comment.push(answerMatch[2]);
      return;
    }

    if (commentMatch) {
      current.comment.push(commentMatch[1]);
      return;
    }

    if (current.options.length || current.answer || current.comment.length) {
      current.comment.push(clean.replace(/^[-*]\s*/, ""));
    } else {
      current.stem.push(clean.replace(/^[-*]\s*/, ""));
    }
  });

  pushCurrent();

  const usefulQuestions = questions.filter((question) => question.stem.length || question.options.length);
  if (!usefulQuestions.length) return renderStudyLines(items);

  return `
    <div class="study-question-set">
      ${usefulQuestions.map(renderStudyQuestionCard).join("")}
    </div>
  `;
}

function renderStudyQuestionCard(question) {
  const options = question.options.length
    ? `<div class="study-question-options">
        ${question.options
          .map((option) => `<div><span>${escapeHtml(option.letter)}</span><p>${formatInline(option.text)}</p></div>`)
          .join("")}
      </div>`
    : "";
  const feedback = question.answer || question.comment.length
    ? `<div class="study-question-feedback">
        ${question.answer ? `<strong>Gabarito: ${escapeHtml(question.answer)}</strong>` : ""}
        ${question.comment.length ? `<p>${formatInline(question.comment.join(" "))}</p>` : ""}
      </div>`
    : "";

  return `
    <article class="study-question-card">
      <div class="study-question-badge">Questao ${escapeHtml(question.number)}</div>
      <div class="study-question-stem">${question.stem.map((line) => `<p>${formatInline(line)}</p>`).join("")}</div>
      ${options}
      ${feedback}
    </article>
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
      feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
    };
  } catch {
    return { studies: [], exams: [], feedbacks: [] };
  }
}

function saveWorkspace() {
  localStorage.setItem(storageKey, JSON.stringify(workspace));
  renderWorkspace();
}

function initTheme() {
  const theme = localStorage.getItem(themeKey) || "light";
  document.documentElement.dataset.theme = theme;
  updateThemeButton();
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(themeKey, next);
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === "dark";
  document.querySelectorAll("[data-toggle-theme]").forEach((button) => {
    button.textContent = isDark ? "Modo claro" : "Modo escuro";
  });
}

function openFeedbackModal() {
  document.querySelector("[data-feedback-modal]")?.classList.remove("is-hidden");
  document.querySelector('[data-feedback-form] textarea[name="message"]')?.focus();
}

function closeFeedbackModal() {
  document.querySelector("[data-feedback-modal]")?.classList.add("is-hidden");
}

function saveFeedback(form) {
  const formData = new FormData(form);
  const message = String(formData.get("message") || "").trim();
  if (!message) return false;

  const feedback = {
    id: `feedback-${Date.now()}`,
    type: String(formData.get("type") || "Sugestao"),
    message,
    contact: String(formData.get("contact") || "").trim(),
    page: document.querySelector("[data-page]:not(.is-hidden)")?.dataset.page || "app",
    date: new Date().toLocaleString("pt-BR"),
  };

  workspace.feedbacks = [feedback, ...(workspace.feedbacks || [])].slice(0, 50);
  saveWorkspace();
  form.reset();
  return true;
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
  libraryGrid.querySelectorAll(".library-empty").forEach((card) => card.remove());

  const normalizedQuery = libraryQuery.trim().toLowerCase();
  const filteredStudies = studies.filter((study) => {
    const matchesFilter =
      libraryFilter === "all" ||
      (libraryFilter === "favorites" && study.favorite) ||
      study.mode === libraryFilter;
    const searchable = `${study.topic} ${study.modeLabel || ""} ${study.excerpt || ""}`.toLowerCase();
    return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  if (!filteredStudies.length) {
    const empty = document.createElement("article");
    empty.className = "library-empty";
    empty.innerHTML = `
      <span>Arquivo vazio</span>
      <h2>Nenhum material encontrado</h2>
      <p>Gere um estudo ou ajuste os filtros da biblioteca.</p>
    `;
    libraryGrid.appendChild(empty);
    return;
  }

  filteredStudies.slice(0, 30).forEach((study) => {
    const card = document.createElement("article");
    card.dataset.savedStudy = study.id;
    card.innerHTML = `
      <span>${study.favorite ? "Favorito · " : ""}${escapeHtml(study.modeLabel || "Estudo")}</span>
      <h2>${escapeHtml(study.topic)}</h2>
      <p>${escapeHtml(study.excerpt || "Material salvo na biblioteca.")}</p>
      <small>${escapeHtml(study.date || "Sem data")}</small>
      <div class="library-actions">
        <button class="outline-button" type="button" data-open-study="${escapeHtmlAttr(study.id)}">Abrir</button>
        <button type="button" data-favorite-study="${escapeHtmlAttr(study.id)}">${study.favorite ? "Desfavoritar" : "Favoritar"}</button>
        <button type="button" data-rename-study="${escapeHtmlAttr(study.id)}">Renomear</button>
        <button type="button" data-delete-study="${escapeHtmlAttr(study.id)}">Apagar</button>
      </div>
    `;
    libraryGrid.appendChild(card);
  });
}

function saveCurrentStudy() {
  if (!lastStudy?.topic || !lastStudy?.text) return false;
  const id = `study-${Date.now()}`;
  const study = {
    id,
    topic: lastStudy.topic,
    text: lastStudy.text,
    mode: lastStudy.mode || "",
    modeLabel: lastStudy.modeLabel || "Estudo juridico",
    favorite: Boolean(lastStudy.favorite),
    excerpt: resultContent.textContent.trim().slice(0, 130),
    date: new Date().toLocaleDateString("pt-BR"),
  };
  workspace.studies = [study, ...workspace.studies.filter((item) => item.topic !== study.topic)].slice(0, 30);
  saveWorkspace();
  return true;
}

function updateStudyById(id, updater) {
  let changed = false;
  workspace.studies = (workspace.studies || []).map((study) => {
    if (study.id !== id) return study;
    changed = true;
    return updater({ ...study });
  });
  if (changed) saveWorkspace();
  return changed;
}

function deleteStudyById(id) {
  const before = workspace.studies?.length || 0;
  workspace.studies = (workspace.studies || []).filter((study) => study.id !== id);
  if ((workspace.studies?.length || 0) !== before) saveWorkspace();
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportResult(button) {
  if (!lastStudy?.text) return;

  setLoading(button, true, "Gerando PDF...");
  const filename = `${slugify(lastStudy.topic || "preceptorjus-estudo")}.pdf`;

  if (window.jspdf?.jsPDF) {
    try {
      exportStructuredPdf(filename);
    } finally {
      setLoading(button, false);
    }
    return;
  }

  if (!window.html2pdf) {
    window.print();
    setLoading(button, false);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "pdf-export-root";
  wrapper.innerHTML = `
    <div class="pdf-document">
      ${renderFormalPdfDocument(lastStudy.text, lastStudy)}
    </div>
  `;
  document.body.appendChild(wrapper);

  try {
    await window
      .html2pdf()
      .set({
        margin: [8, 8, 10, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
          windowWidth: 720,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css"],
          avoid: [".formal-section header", ".formal-question-options div", ".formal-question-feedback", ".formal-map-core", ".formal-map-branch"],
        },
      })
      .from(wrapper.querySelector(".pdf-document"))
      .save();
  } finally {
    wrapper.remove();
    setLoading(button, false);
  }
}

function exportStructuredPdf(filename) {
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  if (isMindMapMode(lastStudy)) {
    drawMindMapPdf(doc, lastStudy.text, lastStudy);
  } else {
    drawStudyPdf(doc, lastStudy.text, lastStudy);
  }
  doc.save(filename);
}

function drawStudyPdf(doc, markdown, meta = {}) {
  const sections = parseStudySections(markdown, meta).filter((section) => getSectionPlainLines(section).length);
  const state = createPdfState(doc);
  const topic = meta.topic || "Estudo juridico";

  drawPdfHeader(state, meta.modeLabel || "Documento de estudo", topic);
  drawPdfSummary(state, sections);
  sections.forEach((section, index) => drawPdfSection(state, section, index));
  drawPdfFooter(state);
}

function drawMindMapPdf(doc, markdown, meta = {}) {
  const sections = parseStudySections(markdown, meta).filter((section) => getSectionPlainLines(section).length);
  const model = buildMindMapModel(sections, meta);
  const state = createPdfState(doc);

  drawPdfHeader(state, "Mapa mental juridico", model.topic);
  ensurePdfSpace(state, 168);

  const centerX = 105;
  const centerY = state.y + 74;
  const coreRadius = 22;

  state.doc.setDrawColor(185, 144, 77);
  state.doc.setLineWidth(0.3);
  state.doc.circle(centerX, centerY, 58);

  model.branches.forEach((branch, index) => {
    const angle = model.branches.length > 1 ? -150 + (300 / (model.branches.length - 1)) * index : 0;
    const radians = (angle * Math.PI) / 180;
    const nodeX = centerX + Math.cos(radians) * 67;
    const nodeY = centerY + Math.sin(radians) * 57;
    drawPdfLine(state, centerX, centerY, nodeX, nodeY);
    drawPdfMindMapNode(state, branch, nodeX, nodeY, index);
  });

  state.doc.setFillColor(17, 29, 46);
  state.doc.setDrawColor(17, 29, 46);
  state.doc.circle(centerX, centerY, coreRadius, "FD");
  state.doc.setTextColor(255, 255, 255);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(11);
  drawCenteredPdfText(state, model.centralText, centerX, centerY - 4, 31, 5);

  state.y += 168;
  drawPdfFooter(state);
}

function createPdfState(doc) {
  return {
    doc,
    margin: 18,
    width: 174,
    pageHeight: 297,
    y: 18,
  };
}

function drawPdfHeader(state, label, title) {
  const date = new Date().toLocaleDateString("pt-BR");
  const { doc, margin, width } = state;

  doc.setTextColor(17, 29, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PRECEPTORJUS", margin, state.y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(122, 128, 138);
  doc.text(`Gerado em ${date}`, margin + width, state.y, { align: "right" });

  state.y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(138, 103, 45);
  doc.text(cleanPdfText(label).toUpperCase(), margin, state.y);

  state.y += 12;
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(17, 29, 46);
  writePdfWrapped(state, title, 10, "times", "bold", width, 9);

  state.y += 4;
  doc.setDrawColor(17, 29, 46);
  doc.setLineWidth(0.6);
  doc.line(margin, state.y, margin + width, state.y);
  state.y += 12;
}

function drawPdfSummary(state, sections) {
  ensurePdfSpace(state, 32);
  const { doc, margin, width } = state;
  doc.setFillColor(248, 245, 239);
  doc.setDrawColor(216, 209, 196);
  doc.rect(margin, state.y, width, 12 + sections.length * 6, "FD");
  state.y += 8;
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 29, 46);
  doc.text("Sumario", margin + 6, state.y);
  state.y += 8;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  sections.forEach((section, index) => {
    doc.text(`${index + 1}. ${cleanPdfText(section.title)}`, margin + 8, state.y);
    state.y += 6;
  });
  state.y += 10;
}

function drawPdfSection(state, section, index) {
  ensurePdfSpace(state, 28);
  const { doc, margin } = state;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(164, 122, 53);
  doc.text(String(index + 1).padStart(2, "0"), margin, state.y);

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 29, 46);
  doc.text(cleanPdfText(section.title), margin + 10, state.y);
  state.y += 9;

  const lines = section.lines
    .map((item) => (item.type === "subheading" ? `### ${item.text}` : String(item.text || "")))
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    if (line.startsWith("### ")) {
      state.y += 2;
      writePdfWrapped(state, line.slice(4), 11, "times", "bold", state.width, 6);
      return;
    }
    const bullet = line.match(/^[\-*\u2022]\s+(.+)$/);
    writePdfWrapped(state, bullet ? `• ${bullet[1]}` : line.replace(/^\d+\.\s+/, ""), 10.4, "times", "normal", state.width, 5.6);
  });

  state.y += 5;
  doc.setDrawColor(229, 222, 210);
  doc.line(margin, state.y, margin + state.width, state.y);
  state.y += 8;
}

function drawPdfMindMapNode(state, branch, x, y, index) {
  const { doc } = state;
  const boxW = 48;
  const boxH = 31;
  const left = Math.min(Math.max(x - boxW / 2, state.margin), 210 - state.margin - boxW);
  const top = Math.min(Math.max(y - boxH / 2, 74), 245);

  doc.setFillColor(251, 250, 247);
  doc.setDrawColor(216, 209, 196);
  doc.roundedRect(left, top, boxW, boxH, 3, 3, "FD");
  doc.setTextColor(17, 29, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.text(`${String(index + 1).padStart(2, "0")} ${cleanPdfText(branch.title)}`, left + 4, top + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  branch.points.slice(0, 2).forEach((point, pointIndex) => {
    const wrapped = doc.splitTextToSize(`• ${cleanPdfText(point)}`, boxW - 8).slice(0, 2);
    doc.text(wrapped, left + 4, top + 14 + pointIndex * 8);
  });
}

function drawPdfLine(state, x1, y1, x2, y2) {
  state.doc.setDrawColor(185, 144, 77);
  state.doc.setLineWidth(0.25);
  state.doc.line(x1, y1, x2, y2);
}

function drawCenteredPdfText(state, text, x, y, maxWidth, lineHeight) {
  const lines = state.doc.splitTextToSize(cleanPdfText(text), maxWidth).slice(0, 4);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => state.doc.text(line, x, startY + index * lineHeight, { align: "center" }));
}

function writePdfWrapped(state, text, fontSize, fontFamily, fontStyle, maxWidth, lineHeight) {
  const clean = cleanPdfText(text);
  if (!clean) return;
  const { doc, margin } = state;
  doc.setFont(fontFamily, fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(41, 50, 68);
  const lines = doc.splitTextToSize(clean, maxWidth);
  lines.forEach((line) => {
    ensurePdfSpace(state, lineHeight + 4);
    doc.text(line, margin, state.y);
    state.y += lineHeight;
  });
  state.y += 2;
}

function ensurePdfSpace(state, needed) {
  if (state.y + needed <= state.pageHeight - 18) return;
  drawPdfFooter(state);
  state.doc.addPage();
  state.y = 18;
}

function drawPdfFooter(state) {
  const { doc, margin, width, pageHeight } = state;
  doc.setDrawColor(216, 209, 196);
  doc.line(margin, pageHeight - 14, margin + width, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(102, 112, 133);
  doc.text("Conteudo academico. Confira legislacao, jurisprudencia e fontes oficiais aplicaveis.", margin, pageHeight - 9);
}

function cleanPdfText(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function copyResult() {
  const text = resultContent.textContent.trim();
  if (!text) return;
  await navigator.clipboard?.writeText(text);
}

function slugify(value) {
  return String(value || "preceptorjus-estudo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "preceptorjus-estudo";
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

function resetStudyForm() {
  const topicInput = document.querySelector("#topicInput");
  const goalsInput = document.querySelector("#goalsInput");
  const modeSelect = document.querySelector("#studyMode");

  lastStudy = null;
  lastSubmitter = null;
  if (topicInput) {
    topicInput.value = "";
    topicInput.classList.remove("field-error");
  }
  if (goalsInput) goalsInput.value = "";
  if (modeSelect) modeSelect.value = "fechamento";

  resultContent.innerHTML = `
    <div class="placeholder">
      <strong>Nenhum estudo gerado</strong>
      <span>Insira um tema juridico e gere a nota.</span>
    </div>
  `;

  topicInput?.focus();
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

  if (event.target.closest("[data-toggle-theme]")) {
    toggleTheme();
    return;
  }

  if (event.target.closest("[data-open-feedback]")) {
    openFeedbackModal();
    return;
  }

  if (event.target.closest("[data-close-feedback]")) {
    closeFeedbackModal();
    return;
  }

  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    if (routeButton.closest(".landing-view")) return;
    showRoute(routeButton.dataset.route);
    if (routeButton.matches("[data-new-study]")) {
      resetStudyForm();
    }
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
    exportResult(exportButton);
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

  const favoriteStudyButton = event.target.closest("[data-favorite-study]");
  if (favoriteStudyButton) {
    updateStudyById(favoriteStudyButton.dataset.favoriteStudy, (study) => ({ ...study, favorite: !study.favorite }));
    return;
  }

  const renameStudyButton = event.target.closest("[data-rename-study]");
  if (renameStudyButton) {
    const study = workspace.studies.find((item) => item.id === renameStudyButton.dataset.renameStudy);
    const nextTopic = window.prompt("Novo nome do material:", study?.topic || "");
    if (nextTopic?.trim()) {
      updateStudyById(renameStudyButton.dataset.renameStudy, (item) => ({ ...item, topic: nextTopic.trim() }));
    }
    return;
  }

  const deleteStudyButton = event.target.closest("[data-delete-study]");
  if (deleteStudyButton) {
    if (window.confirm("Apagar este material da biblioteca?")) {
      deleteStudyById(deleteStudyButton.dataset.deleteStudy);
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

document.querySelector("[data-library-search]")?.addEventListener("input", (event) => {
  libraryQuery = event.currentTarget.value || "";
  renderWorkspace();
});

document.querySelector("[data-library-filter]")?.addEventListener("change", (event) => {
  libraryFilter = event.currentTarget.value || "all";
  renderWorkspace();
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
    lastStudy = { topic, text, mode, modeLabel };
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
        <button type="button" data-export-flashcards>Exportar CSV</button>
      </div>
    </div>
  `;
}

function exportFlashcardsCsv() {
  if (!currentFlashcards?.cards?.length) return;
  const rows = [["Frente", "Verso"]];
  currentFlashcards.cards.forEach((card) => rows.push([card.front, card.back]));
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  downloadTextFile(`${slugify(currentFlashcards.topic || "flashcards")}.csv`, csv, "text/csv;charset=utf-8");
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

function renderChatAnswer(markdown) {
  const lines = String(markdown || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim());
  let html = `<div class="chat-answer">`;
  let list = [];

  const flushList = () => {
    if (!list.length) return;
    html += `<ul>${list.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`;
    list = [];
  };

  lines.forEach((line) => {
    if (!line || /^-{3,}$/.test(line)) {
      flushList();
      return;
    }

    const heading = line.match(/^#{2,3}\s+(.+)$/);
    if (heading) {
      flushList();
      html += `<h3>${formatInline(heading[1])}</h3>`;
      return;
    }

    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      flushList();
      html += `<div class="chat-point"><span>${numbered[1]}</span><p>${formatInline(numbered[2])}</p></div>`;
      return;
    }

    const bullet = line.match(/^[\-\*\u2022]\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }

    const titleLike = line.length <= 80 && /:$/.test(line);
    if (titleLike) {
      flushList();
      html += `<h3>${formatInline(line.replace(/:$/, ""))}</h3>`;
      return;
    }

    flushList();
    const isLegal = /\b(lei|art\.|artigo|codigo|constituicao|stf|stj|lgpd|marco civil|jurisprudencia|sumula)\b/i.test(line);
    html += `<p class="${isLegal ? "chat-legal" : ""}">${formatInline(line)}</p>`;
  });

  flushList();
  html += `</div>`;
  return html;
}

document.addEventListener("click", (event) => {
  const flipButton = event.target.closest("[data-flip-card]");
  const nextFlashcard = event.target.closest("[data-next-flashcard]");
  const prevFlashcard = event.target.closest("[data-prev-flashcard]");
  const exportFlashcardsButton = event.target.closest("[data-export-flashcards]");
  if (exportFlashcardsButton) {
    exportFlashcardsCsv();
    return;
  }

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

async function handleChatSubmit(event) {
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
  assistant.innerHTML = `<div class="chat-thinking"><span></span><span></span><span></span> Analisando juridicamente...</div>`;
  event.currentTarget.before(assistant);

  try {
    assistant.innerHTML = renderChatAnswer(await callAI({ mode: "chat", message: value }));
  } catch (error) {
    assistant.innerHTML = `<div class="chat-answer"><p>Nao consegui responder agora. ${escapeHtml(error.message)}</p></div>`;
  } finally {
    setLoading(submit, false);
  }
}

document.querySelectorAll("[data-chat-form]").forEach((form) => {
  form.addEventListener("submit", handleChatSubmit);
});

document.querySelector("[data-feedback-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  if (!saveFeedback(event.currentTarget)) return;
  button.textContent = "Feedback enviado";
  setTimeout(() => {
    button.textContent = "Enviar feedback";
    closeFeedbackModal();
  }, 900);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeFeedbackModal();
});
