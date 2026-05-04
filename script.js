const landing = document.querySelector('[data-screen="landing"]');
const app = document.querySelector('[data-screen="app"]');
const pages = [...document.querySelectorAll("[data-page]")];
const routeButtons = [...document.querySelectorAll("[data-route]")];
const navButtons = [...document.querySelectorAll(".app-nav button")];
const resultContent = document.querySelector("#resultContent");
const libraryGrid = document.querySelector("#libraryGrid");
const examResult = document.querySelector("#examResult");
const flashcardResult = document.querySelector("#flashcardResult");

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
    page.classList.toggle("is-hidden", page.dataset.page !== route);
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

async function callAI(payload) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

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
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function renderError(container, error) {
  container.innerHTML = `
    <h2>Configuracao necessaria</h2>
    <p>${error.message}</p>
    <p>Na Vercel, configure a variavel <strong>OPENAI_API_KEY</strong>. Opcionalmente, configure <strong>OPENAI_MODEL</strong>.</p>
  `;
}

document.querySelectorAll("[data-open-app]").forEach((button) => {
  button.addEventListener("click", () => openApp("menu"));
});

document.querySelector("[data-back-site]").addEventListener("click", backToSite);

routeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.closest(".landing-view")) return;
    showRoute(button.dataset.route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
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

document.querySelector("#studyForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.currentTarget.querySelector(".generate-button");
  const topic = document.querySelector("#topicInput").value.trim() || "Tema juridico";
  const goals = document
    .querySelector("#goalsInput")
    .value.split("\n")
    .map((goal) => goal.trim())
    .filter(Boolean);
  const sections = [...document.querySelectorAll(".section-picker button.selected")].map((item) => item.textContent);

  resultContent.innerHTML = '<div class="placeholder"><strong>Gerando fechamento com IA...</strong><span>Isso pode levar alguns segundos.</span></div>';
  setLoading(button, true);

  try {
    const text = await callAI({ mode: "fechamento", topic, goals, sections });
    resultContent.innerHTML = markdownToHtml(text);

    const card = document.createElement("article");
    card.innerHTML = `
      <span>Gerado agora</span>
      <h2>${topic}</h2>
      <p>Fechamento com objetivos, base legal e pontos de prova.</p>
    `;
    libraryGrid.prepend(card);
  } catch (error) {
    renderError(resultContent, error);
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#examForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  const topic = event.currentTarget.querySelector("input").value.trim();
  examResult.innerHTML = '<p><strong>Gerando simulado...</strong></p>';
  setLoading(button, true);

  try {
    const text = await callAI({ mode: "exam", topic });
    examResult.innerHTML = markdownToHtml(text);
  } catch (error) {
    renderError(examResult, error);
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#flashcardForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  const topic = event.currentTarget.querySelector("input").value.trim();
  flashcardResult.innerHTML = '<p><strong>Gerando flashcards...</strong></p>';
  setLoading(button, true);

  try {
    const text = await callAI({ mode: "flashcards", topic });
    flashcardResult.innerHTML = markdownToHtml(text);
  } catch (error) {
    renderError(flashcardResult, error);
  } finally {
    setLoading(button, false);
  }
});

document.querySelectorAll("[data-answer]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-answer]").forEach((answer) => {
      answer.classList.toggle("correct", answer.dataset.answer === "right");
      answer.classList.toggle("wrong", answer === button && button.dataset.answer !== "right");
    });
  });
});

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
