"use strict";
(() => {
  const data = JSON.parse(document.getElementById("kb-data").textContent);
  const storage = {
    available: true,
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { this.available = false; return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { this.available = false; return false; } }
  };
  let toastTimer;
  function toast(message) {
    const box = document.getElementById("toast");
    box.textContent = message; box.classList.add("visible");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove("visible"), 3500);
  }
  async function copy(text, fallback) {
    try { await navigator.clipboard.writeText(text); toast("已复制，可粘贴到聊天中。"); return true; }
    catch { if (fallback) { fallback.focus(); fallback.select(); } toast("请选中下方内容，手动复制。"); return false; }
  }
  function download(name, text, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const themeKey = "knowbridge:theme";
  const preference = storage.get(themeKey);
  document.documentElement.dataset.theme = preference || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme; storage.set(themeKey, theme);
  });
  document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
  const dialog = document.getElementById("sidechat-dialog");
  let selectedText = "", selectedSection = null, currentAnchor = "";
  function compact(text, limit) { return (text || "").replace(/\s+/g, " ").trim().slice(0, limit); }
  function showQuestion(section) {
    const source = section || selectedSection || document.querySelector("section.active, .question-card.active") || document.querySelector(".lesson-body section, .question-card");
    currentAnchor = source?.id || "";
    document.getElementById("sidechat-anchor").textContent = `${data.title || data.node_id} / ${source?.querySelector("h2, legend")?.textContent || "当前内容"}`;
    const context = selectedText || source?.querySelector("[data-context], p, legend")?.textContent || data.subtitle;
    document.getElementById("sidechat-quote").textContent = compact(context, 800);
    document.getElementById("sidechat-handoff").hidden = true;
    dialog.showModal(); document.getElementById("sidechat-question").focus();
  }
  if (dialog) {
    document.addEventListener("selectionchange", () => {
      const selection = getSelection(); const node = selection?.anchorNode;
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      if (!element || element.closest("dialog")) return;
      if (selection.toString().trim()) {
        selectedText = selection.toString().slice(0, 800); selectedSection = element.closest("section, .question-card");
      } else { selectedText = ""; selectedSection = null; }
    });
    document.getElementById("ask-floating").addEventListener("pointerdown", event => event.preventDefault());
    document.getElementById("ask-floating").addEventListener("click", () => showQuestion(null));
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-ask]");
      if (button) { selectedText = ""; showQuestion(button.closest("section, .question-card")); }
    });
    document.getElementById("prepare-sidechat").addEventListener("click", () => {
      const question = document.getElementById("sidechat-question").value.trim();
      if (!question) { toast("先写下你想问的问题。"); document.getElementById("sidechat-question").focus(); return; }
      const context = data.context || {};
      const file = data.page_kind === "quiz" ? (context.quiz_source_path || context.quiz_path) : context.lesson_path;
      const prompt = [
        "这是 KnowBridge 独立答疑。聚焦此处疑问，不重做课程规划。",
        `学习目标：${compact(context.objective, 260)}`,
        `已有基础：${compact(context.background, 200)}`,
        `位置：${data.node_id} / ${currentAnchor} / ${file || "当前页面"}`,
        `相关原文：${document.getElementById("sidechat-quote").textContent}`,
        `疑问：${question}`,
        data.page_kind === "quiz" ? "这是练习中的提问：先给提示与思路；除非我明确要求，不读取答案钥匙或直接给答案。" : "请用一个贴近原文的小例子解释，需要更多背景时只读上面文件中的相关段落。",
        "不改 profile、graph、plan、progress。仅在发现影响主线的误解或需要补先修知识时，给出最多三条、共160字以内的可选回主线摘要。"
      ].join("\n");
      document.getElementById("sidechat-prompt").value = prompt;
      document.getElementById("sidechat-handoff").hidden = false;
    });
    document.getElementById("copy-side-command").addEventListener("click", async () => {
      const output = document.getElementById("sidechat-prompt"); const original = output.value.replace(/^\/side /, "");
      const command = "/side " + original; output.value = command;
      const copied = await copy(command, output); if (copied) output.value = original;
    });
    document.getElementById("copy-side-prompt").addEventListener("click", () => {
      const output = document.getElementById("sidechat-prompt"); output.value = output.value.replace(/^\/side /, ""); copy(output.value, output);
    });
  }
  window.KB = { data, storage, toast, copy, download };
})();
