document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.clicked === "true") return;
    button.dataset.clicked = "true";
    const original = button.textContent;
    button.textContent = original.includes("Entrar") ? "Login em breve" : "Em breve";

    window.setTimeout(() => {
      button.textContent = original;
      button.dataset.clicked = "false";
    }, 1400);
  });
});
