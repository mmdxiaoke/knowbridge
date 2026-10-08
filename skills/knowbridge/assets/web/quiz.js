"use strict";
(() => {
  const { data, storage, toast, copy, download } = window.KB;
  const quiz = data.quiz, questions = quiz.questions;
  const key = `knowbridge:${data.course_id}:${data.node_id}:${data.quiz_fingerprint}:draft`;
  const status = document.getElementById("draft-status");
  const list = document.getElementById("question-list");
  const fields = new Map();
  function el(tag, className, text) { const e = document.createElement(tag); if (className) e.className = className; if (text !== undefined) e.textContent = text; return e; }
  const typeNames = { single_choice: "单选", multi_choice: "多选", numeric: "计算", open_ended: "迁移与解释" };
  questions.forEach((question, index) => {
    const card = el("section", "question-card"); card.id = `question-${question.id}`;
    const top = el("div", "question-top"); top.append(el("span", "pill", `${String(index + 1).padStart(2, "0")} / ${typeNames[question.type]}`));
    const ask = el("button", "ask-inline", "对此题提问 ↗"); ask.type = "button"; ask.dataset.ask = ""; ask.setAttribute("aria-label", `对此题提问：第 ${index + 1} 题`); top.append(ask); card.append(top);
    const group = el("fieldset"); group.append(el("legend", "", question.prompt));
    const inputs = [];
    if (question.type === "single_choice" || question.type === "multi_choice") {
      for (const [id, label] of Object.entries(question.options)) {
        const option = el("label", "choice-option"); const input = el("input");
        input.type = question.type === "single_choice" ? "radio" : "checkbox"; input.name = question.id; input.value = id;
        option.append(input, el("span", "", `${id}  ${label}`)); group.append(option); inputs.push(input);
      }
    } else {
      const input = el(question.type === "numeric" ? "input" : "textarea", question.type === "numeric" ? "numeric-input" : "");
      input.name = question.id; input.setAttribute("aria-label", question.prompt);
      if (question.type === "numeric") { input.type = "number"; input.step = "any"; input.placeholder = "填写数值"; }
      else { input.rows = 5; input.placeholder = "写下你的推理、例子或实现思路…"; }
      group.append(input); inputs.push(input);
    }
    if (question.hint) { const hint = el("details"); hint.append(el("summary", "", "需要一点提示？"), el("p", "", question.hint)); group.append(hint); }
    if (question.rubric?.length) { const rubric = el("details", "rubric"); rubric.append(el("summary", "", "查看评价标准")); const ul = el("ul"); question.rubric.forEach(item => ul.append(el("li", "", item))); rubric.append(ul); group.append(rubric); }
    card.append(group);
    const confidence = el("div", "confidence-row"); const confidenceLabel = el("label", "", "这题的把握（可选）"); confidenceLabel.htmlFor = `confidence-${question.id}`;
    const select = el("select"); select.id = confidenceLabel.htmlFor;
    [["", "未选择"], ["low", "需要再想想"], ["medium", "大致理解"], ["high", "可以解释给别人"]].forEach(([value, text]) => { const option = el("option", "", text); option.value = value; select.append(option); });
    confidence.append(confidenceLabel, select); card.append(confidence); list.append(card); fields.set(question.id, { question, inputs, confidence: select });
    const nav = el("a", "", String(index + 1)); nav.href = `#${card.id}`; nav.setAttribute("aria-label", `跳到第 ${index + 1} 题`); document.getElementById("question-nav").append(nav);
  });
  function collect() {
    const answers = {}, confidence = {};
    fields.forEach(({ question, inputs, confidence: select }, id) => {
      if (question.type === "multi_choice") { const checked = inputs.filter(input => input.checked).map(input => input.value); if (checked.length) answers[id] = checked; }
      else if (question.type === "single_choice") { const checked = inputs.find(input => input.checked); if (checked) answers[id] = checked.value; }
      else if (inputs[0].value.trim()) { const value = question.type === "numeric" ? Number(inputs[0].value) : inputs[0].value; if (question.type !== "numeric" || Number.isFinite(value)) answers[id] = value; }
      if (select.value) confidence[id] = select.value;
    });
    return { schema_version: 1, node_id: data.node_id, quiz_fingerprint: data.quiz_fingerprint, submitted_at: new Date().toISOString(), answers, confidence };
  }
  function validateImport(submission) {
    if (!submission || typeof submission !== "object" || Array.isArray(submission)) throw new Error("答案必须是 JSON 对象。");
    if (submission.node_id && submission.node_id !== data.node_id) throw new Error("这份答案属于另一节课程。");
    if (submission.quiz_fingerprint && submission.quiz_fingerprint !== data.quiz_fingerprint) throw new Error("题目版本不同，请核对后在新题组作答。");
    const answers = Object.hasOwn(submission, "answers") ? submission.answers : submission;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new Error("答案格式不正确。");
    for (const [id, value] of Object.entries(answers)) {
      const q = fields.get(id)?.question; if (!q) throw new Error(`未找到题号：${id}`);
      if (q.type === "single_choice" && (typeof value !== "string" || !Object.hasOwn(q.options, value))) throw new Error(`${id} 的选项无效。`);
      if (q.type === "multi_choice" && (!Array.isArray(value) || !value.every(v => Object.hasOwn(q.options, v)) || new Set(value).size !== value.length)) throw new Error(`${id} 的多选答案无效。`);
      if (q.type === "numeric" && (typeof value !== "number" || !Number.isFinite(value))) throw new Error(`${id} 需要有限数值。`);
      if (q.type === "open_ended" && typeof value !== "string") throw new Error(`${id} 需要文字答案。`);
    }
    return answers;
  }
  function apply(submission) {
    const answers = validateImport(submission);
    fields.forEach(({ question, inputs, confidence }, id) => {
      const value = answers[id];
      if (question.type === "single_choice" || question.type === "multi_choice") inputs.forEach(input => input.checked = question.type === "multi_choice" ? Array.isArray(value) && value.includes(input.value) : input.value === value);
      else inputs[0].value = value ?? "";
      const certainty = submission.confidence?.[id]; confidence.value = ["low", "medium", "high"].includes(certainty) ? certainty : "";
    });
  }
  function update(save = true) {
    const submission = collect(); const count = Object.keys(submission.answers).length;
    document.getElementById("answered-count").textContent = count;
    document.getElementById("total-count").textContent = `/ ${questions.length} 题`;
    const progress = document.getElementById("quiz-progress"); progress.max = questions.length; progress.value = count;
    [...document.getElementById("question-nav").children].forEach((link, index) => link.classList.toggle("answered", Object.hasOwn(submission.answers, questions[index].id)));
    if (save) status.textContent = storage.set(key, submission) ? "草稿已保存在此浏览器" : "浏览器存储不可用，请导出答案保存";
  }
  function openExport() {
    const submission = collect(); const remaining = questions.length - Object.keys(submission.answers).length;
    document.getElementById("export-text").value = JSON.stringify(submission, null, 2);
    document.getElementById("export-dialog").showModal();
    if (remaining) toast(`还有 ${remaining} 题未作答；可以先保存草稿。`);
  }
  const saved = storage.get(key);
  if (saved) { try { apply(saved); } catch { toast("旧草稿格式有误，未覆盖当前答案。"); } }
  status.textContent = storage.available ? (saved ? "已恢复本题组草稿" : "作答后自动保存草稿") : "浏览器存储不可用，请导出保存";
  update(false);
  document.getElementById("quiz-form").addEventListener("input", () => update());
  document.getElementById("quiz-form").addEventListener("change", () => update());
  document.getElementById("quiz-form").addEventListener("submit", event => { event.preventDefault(); openExport(); });
  document.getElementById("export-button").addEventListener("click", openExport);
  document.getElementById("copy-answers").addEventListener("click", async () => { openExport(); const output = document.getElementById("export-text"); await copy(output.value, output); });
  document.getElementById("copy-export").addEventListener("click", () => { const output = document.getElementById("export-text"); copy(output.value, output); });
  document.getElementById("download-answers").addEventListener("click", () => download(`${data.node_id}-submission.json`, document.getElementById("export-text").value));
  document.getElementById("import-answers").addEventListener("change", async event => {
    const file = event.target.files[0]; if (!file) return;
    try { const submission = JSON.parse(await file.text()); validateImport(submission); if (Object.keys(collect().answers).length && !confirm("用导入的草稿替换当前作答？")) return; apply(submission); update(); toast("草稿已导入。"); }
    catch (error) { toast(`未导入：${error.message}`); }
    finally { event.target.value = ""; }
  });
  function activeQuestion() { const cards = [...list.children]; const active = cards.filter(card => card.getBoundingClientRect().top <= 180).at(-1) || cards[0]; cards.forEach(card => card.classList.toggle("active", card === active)); }
  addEventListener("scroll", activeQuestion, { passive: true }); activeQuestion();
})();
