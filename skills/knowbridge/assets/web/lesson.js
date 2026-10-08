"use strict";
(() => {
  const { data, storage } = window.KB;
  const key = `knowbridge:${data.course_id}:${data.node_id}:${data.lesson_fingerprint}:reading`;
  const sections = [...document.querySelectorAll(".lesson-body section[id]")];
  const toc = document.getElementById("lesson-toc");
  document.getElementById("goal-short").textContent = data.context.objective || "完成本节练习，验证自己能否迁移使用。";
  for (const section of sections) {
    const heading = section.querySelector("h2");
    if (!heading) continue;
    const link = document.createElement("a"); link.href = `#${section.id}`; link.textContent = heading.textContent; toc.append(link);
    const wrapper = document.createElement("div"); wrapper.className = "section-heading"; heading.before(wrapper); wrapper.append(heading);
    const ask = document.createElement("button"); ask.className = "ask-inline"; ask.type = "button"; ask.dataset.ask = ""; ask.textContent = "对此处提问 ↗"; ask.setAttribute("aria-label", `对此处提问：${heading.textContent}`); wrapper.append(ask);
  }
  let saveTimer;
  function update() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const percent = Math.max(0, Math.min(100, Math.round(100 * scrollY / max)));
    document.getElementById("reading-meter").style.width = `${percent}%`;
    document.getElementById("read-state").textContent = `阅读位置 ${percent}%`;
    const active = sections.filter(s => s.getBoundingClientRect().top <= 160).at(-1) || sections[0];
    sections.forEach(s => s.classList.toggle("active", s === active));
    [...toc.children].forEach(link => link.classList.toggle("active", link.hash === `#${active?.id}`));
    clearTimeout(saveTimer); saveTimer = setTimeout(() => storage.set(key, { scroll: scrollY, anchor: active?.id, updated_at: new Date().toISOString() }), 400);
  }
  const saved = storage.get(key);
  if (saved && !location.hash && Number.isFinite(saved.scroll)) requestAnimationFrame(() => scrollTo({ top: saved.scroll, behavior: "instant" }));
  addEventListener("scroll", update, { passive: true }); addEventListener("resize", update); update();
})();
