"use strict";
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll('[data-demo="steps"]').forEach(demo => {
    const steps = [...demo.querySelectorAll("[data-steps] > li")];
    if (!steps.length) return;
    let position = 0, timer = null;
    const play = demo.querySelector('[data-action="play"]');
    function draw() {
      steps.forEach((step, index) => { step.classList.toggle("active", index === position); step.setAttribute("aria-current", index === position ? "step" : "false"); });
      demo.querySelector("[data-step-caption]").textContent = `${position + 1} / ${steps.length} · ${steps[position].dataset.caption || steps[position].textContent}`;
    }
    function stop() { clearInterval(timer); timer = null; if (play) { play.textContent = "播放演示"; play.setAttribute("aria-pressed", "false"); } }
    function move(delta) { stop(); position = (position + delta + steps.length) % steps.length; draw(); }
    demo.querySelector('[data-action="prev"]')?.addEventListener("click", () => move(-1));
    demo.querySelector('[data-action="next"]')?.addEventListener("click", () => move(1));
    demo.querySelector('[data-action="reset"]')?.addEventListener("click", () => { stop(); position = 0; draw(); });
    if (play) {
      play.disabled = reduced.matches;
      reduced.addEventListener("change", () => { play.disabled = reduced.matches; if (reduced.matches) stop(); });
      play.addEventListener("click", () => {
        if (timer) { stop(); return; }
        play.textContent = "暂停演示"; play.setAttribute("aria-pressed", "true");
        timer = setInterval(() => { position = (position + 1) % steps.length; draw(); }, 1800);
      });
    }
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }).observe(demo);
    draw();
  });
  document.querySelectorAll('[data-demo="weighted-sum"]').forEach(demo => {
    const slider = demo.querySelector('input[type="range"]');
    const a = Number(demo.dataset.a), b = Number(demo.dataset.b);
    if (!slider || !Number.isFinite(a) || !Number.isFinite(b)) return;
    const original = slider.value;
    function draw() {
      const weight = Number(slider.value) / 100;
      demo.querySelector("[data-weight-a]").textContent = weight.toFixed(2);
      demo.querySelector("[data-weight-b]").textContent = (1 - weight).toFixed(2);
      demo.querySelector("[data-bar-a]").style.transform = `scaleX(${weight})`;
      demo.querySelector("[data-bar-b]").style.transform = `scaleX(${1 - weight})`;
      demo.querySelector("output").textContent = `${weight.toFixed(2)} × ${a} + ${(1 - weight).toFixed(2)} × ${b} = ${(weight * a + (1 - weight) * b).toFixed(2)}`;
    }
    slider.addEventListener("input", draw);
    demo.querySelector('[data-action="reset"]')?.addEventListener("click", () => { slider.value = original; draw(); });
    draw();
  });
})();
