const landing = document.querySelector('[data-screen="landing"]');
const app = document.querySelector('[data-screen="app"]');
const pages = [...document.querySelectorAll("[data-page]")];
const routeButtons = [...document.querySelectorAll("[data-route]")];
const navButtons = [...document.querySelectorAll(".app-nav button")];
const resultContent = document.querySelector("#resultContent");
const libraryGrid = document.querySelector("#libraryGrid");

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

document.querySelectorAll("[data-open-app]").forEach((button) => {
  button.addEventListener("click", () => openApp("menu"));
});

document.querySelector("[data-back-site]").addEventListener("click", backToSite);

routeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.closest(".landing-view")) return;
    showRoute(button.dataset.route);
    document.querySelector(".app-main").scrollTo?.({ top: 0, behavior: "smooth" });
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

document.querySelector("#studyForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const topic = document.querySelector("#topicInput").value.trim() || "Tema juridico";
  const goals = document
    .querySelector("#goalsInput")
    .value.split("\n")
    .map((goal) => goal.trim())
    .filter(Boolean);

  resultContent.innerHTML = `
    <h2>${topic}</h2>
    <p><strong>Fechamento juridico gerado:</strong> organize o estudo a partir do problema, identifique a norma aplicavel e conecte a tese com a forma como a banca costuma cobrar.</p>

    <h3>Objetivos de aprendizagem</h3>
    <ul>
      ${
        goals.length
          ? goals.map((goal) => `<li>${goal}</li>`).join("")
          : "<li>Definir o instituto juridico.</li><li>Mapear base legal e excecoes.</li><li>Resolver questoes aplicadas.</li>"
      }
    </ul>

    <h3>Base legal</h3>
    <p>Comece pela regra geral, destaque requisitos e marque hipoteses especiais. Em responsabilidade civil, revise conduta, dano, nexo causal, culpa e risco.</p>

    <h3>Como cai em prova</h3>
    <p>A banca costuma trocar requisito, inverter regra e excecao ou confundir responsabilidade subjetiva com objetiva.</p>
  `;

  const card = document.createElement("article");
  card.innerHTML = `
    <span>Gerado agora</span>
    <h2>${topic}</h2>
    <p>Fechamento com objetivos, base legal e pontos de prova.</p>
  `;
  libraryGrid.prepend(card);
});

document.querySelectorAll("[data-answer]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-answer]").forEach((answer) => {
      answer.classList.toggle("correct", answer.dataset.answer === "right");
      answer.classList.toggle("wrong", answer === button && button.dataset.answer !== "right");
    });
  });
});

document.querySelector("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const value = input.value.trim();
  if (!value) return;

  const user = document.createElement("div");
  user.className = "message user";
  user.textContent = value;

  const assistant = document.createElement("div");
  assistant.className = "message assistant";
  assistant.textContent =
    "Boa pergunta. Para responder com seguranca, separe conceito, fundamento legal, excecoes e exemplo de prova.";

  event.currentTarget.before(user, assistant);
  input.value = "";
});
