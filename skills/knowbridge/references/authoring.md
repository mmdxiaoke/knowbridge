# HTML authoring and data contract

## Contents
- Inputs and builder
- Teaching and visual quality
- Demonstration components
- Quizzes, submissions, and grading
- State and compatibility

## Inputs and builder

Replace `<skill-dir>` with the installed skill directory. Require only Python's standard library; do not install a frontend framework or call a model to rebuild the interface.

Write `lessons/<node>.content.html`, `lessons/<node>.meta.json`, and `quizzes/<node>.json`. Then run:

```text
python <skill-dir>/scripts/build.py <project>/knowbridge <node>
python <skill-dir>/scripts/preview.py <new-empty-preview-directory>
```

The builder generates `index.html`, `lessons/<node>.html`, `quizzes/<node>.html`, and shared `ui/` assets. It does not read or write answer keys, submissions, or progress. The index uses graph status as a build-time snapshot. Rebuild after grading when graph status changes. Keep the authored fragments; generated files can be regenerated.

Node and section IDs must contain only letters, digits, `_`, or `-`, start with a letter/digit, and be at most 80 characters. Do not put filesystem paths in an ID. Use stable IDs across edits to preserve help anchors.

Minimal metadata:

```json
{
  "node_id": "softmax",
  "title": "从相对大小理解 softmax",
  "subtitle": "把分数变成可用于信息合成的非负比例。",
  "estimated_minutes": 20,
  "level": "基础与迁移",
  "context": {
    "objective": "阅读目标论文中的注意力公式",
    "background": "会指数运算和向量加权求和"
  }
}
```

Keep `context.objective` under 260 and `context.background` under 200 characters. Copy only the background needed for this unit, not the entire profile. The builder adds absolute lesson/practice paths automatically; practice help links to the question JSON so the help agent can read only that question. Optional `demo_script` must be exactly `<node>.demo.js` in `lessons/`; the builder copies it to `ui/demos/` and loads it after the shared scripts.

Write a fragment, not another HTML document:

```html
<section id="intuition">
  <h2>01 · 从熟悉的比例出发</h2>
  <p data-context>本段独立答疑所需的核心解释。这里也属于正式正文。</p>
  <div class="callout"><strong>连接已有知识</strong><p>具体的旧概念如何帮助理解新概念。</p></div>
</section>
```

Each top-level section needs an `id` and one `h2`. The runtime derives its directory and inline help buttons from those headings. Optional `data-context` marks a concise, meaningful passage for help. Without it, help uses the first paragraph. Include the actual explanation in the authored fragment; the shell is not a substitute for a lesson.

Do not use inline JavaScript, event attributes, iframes, or a remote CDN. Use local custom demo scripts. Escape external text before inserting it as HTML. The builder escapes metadata and embedded JSON; quiz answers are rendered as text. Do not introduce a backend, API key, telemetry, chat service, or remote model call for the default offline course.

## Teaching and visual quality

- Lead with why this unit helps the practical goal. Connect a familiar concept to the new one, and explicitly state where the analogy stops.
- Use readable Chinese typography, a constrained text width, meaningful spacing, a quiet palette, responsive navigation, and diagrams with labels. The bundled design handles this; customize only when it improves learning.
- Use paragraphs to carry the reasoning. Cards, tables, and formula panels should support it; avoid converting every paragraph into a card or replacing explanations with terse headings.
- Keep the essential lesson visible. Use `<details>` for extra derivations, optional depth, hints, or misconceptions; never require submitting a quiz to reveal core teaching.
- Define notation and units. For formulas, use native MathML or clear typeset HTML with accessible labels. Bundle a local math renderer only when complexity justifies it; do not depend on network fonts or formula libraries for offline use.
- Label simplifications and distinguish pedagogical animation from actual timing/causality. Verify calculations and a meaningful edge case. Static SVG plus text is preferable when interaction adds little.
- Use learner language for teaching. The bundled UI is Chinese. For another language, localize UI once for that course and retain shared assets; if rebuilding, reapply that course's localizations rather than repeatedly translating the shell.

## Demonstration components

Use a built-in component only if it fits the concept. They do not require per-lesson JavaScript. Copy just the needed markup from `assets/examples/mix.content.html`; do not read the full template bundle for every course.

**Process steps:** use `.demo[data-demo="steps"]`, an `ol[data-steps]` with `li[data-caption]`, a `p[data-step-caption]`, and buttons whose `data-action` values are `prev`, `play`, `next`, `reset`. The runtime highlights steps, changes the explanation, supports pause/reset, and disables autoplay when reduced motion is requested. Steps are also readable statically.

**Two-term normalized weighted sum:** use `.demo[data-demo="weighted-sum"][data-a][data-b]`, a labeled range input from 0 to 100, `data-weight-a`, `data-weight-b`, `data-bar-a`, `data-bar-b`, an `output`, and a reset button. It displays `w*a + (1-w)*b`. Use it for interpolation/convex combinations, not as a universal demo for unrelated subjects.

**Comparison or optional derivation:** use `.comparison-grid`, `.concept-card`, `.formula`, `.callout`, `.table-scroll`, or standard `<details>`. A comparison can stay static and still aid learning.

For a custom simulation, author `lessons/<node>.demo.js` and set `demo_script` in metadata. Scope selectors to its demo root. Use DOM/SVG/canvas as appropriate; avoid frameworks for a small interaction. Provide labeled input controls, current values, reset and pause for timed motion, an observable learning result, and readable fallback text. Respect `prefers-reduced-motion`, pause when hidden/offscreen, and make essential information available to keyboard and screen-reader users. Use the shared color variables; put small scoped CSS in the content fragment if needed.

Verify that changing a parameter changes the correct conceptual quantity, compare one expected calculation, and check a boundary case. Avoid an impressive-looking but mathematically wrong visualization.

## Quizzes, submissions, and grading

Public question format (5–10 items in an actual batch):

```json
{
  "node_id": "softmax",
  "questions": [
    {"id":"q1","type":"single_choice","prompt":"选择一个结论。","options":{"A":"选项一","B":"选项二"}},
    {"id":"q2","type":"numeric","prompt":"计算一个值。","tolerance":0.001},
    {"id":"q3","type":"multi_choice","prompt":"选择所有成立的结论。","options":{"A":"结论一","B":"结论二"}},
    {"id":"q4","type":"open_ended","prompt":"解释或迁移到新场景。","rubric":["概念正确","推理充分","边界明确"],"hint":"可选且不直接揭示答案的提示。"}
  ]
}
```

This abbreviated schema example is not a full batch. Support `single_choice`, `multi_choice`, `numeric`, `open_ended`. A proof or coding item belongs to `open_ended` and must have a task-specific rubric. Do not embed keys or full solutions in hints, options metadata, source HTML, or browser storage. Choice keys should be stable short identifiers; numeric tolerance must be finite and nonnegative.

Private key format in `answers/<node>.json`:

```json
{"node_id":"softmax","answers":{"q1":{"value":"A","explanation":"..."},"q2":{"value":2.0,"explanation":"..."},"q3":{"value":["A","B"],"explanation":"..."}}}
```

Keep objective keys synchronized with public questions. Optionally add the builder's `quiz_fingerprint` to the key to reject a stale key. Never copy `answers/` into a publicly hosted asset bundle.

The practice form renders the whole batch, autosaves drafts, preserves per-item confidence, supports importing drafts, and exports:

```json
{"schema_version":1,"node_id":"softmax","quiz_fingerprint":"<build-generated>","submitted_at":"<ISO timestamp>","answers":{"q1":"A","q2":2.001,"q3":["A","B"],"q4":"我的解释"},"confidence":{"q2":"medium"}}
```

The fingerprint depends on the public quiz content. Draft keys include course path, node, and fingerprint; another course/version must not reuse the current draft accidentally. LocalStorage is convenience storage, not authoritative evidence, and may be unavailable for local files or restricted browsers. A download/copy path remains available; clipboard failure exposes selectable text. Warn about unfinished items without preventing a draft export. Do not claim that export grades the work.

Save the real learner export under `submissions/` and run:

```text
python <skill-dir>/scripts/grade.py <questions.json> <answer-key.json> <submission.json>
```

The grader supports versioned exports and legacy bare answer maps. Versioned exports reject mismatched node/fingerprint, unknown IDs, and missing objective keys. Open-ended items return `manual_review`; absent objective answers return `unanswered` and count toward the objective denominator. `complete` reports whether every question ID was supplied, not proof of a meaningful answer. Inspect completeness and manually review invalid/blank/open-ended work before recording mastery. An all-open-ended quiz has no objective percentage, not a fabricated zero or perfect score.

## State and compatibility

Keep a project's established `grade_and_record.py` or similar recorder and validation rules. When it accepts only a bare map, validate the new envelope with `normalize_submission(quiz, export)` from the bundled grader, then pass the resulting map through the existing recorder. Preserve node/fingerprint provenance in the saved original export or report. Do not bypass its evidence, completion, score, or repeat-attempt checks.

Review only the relevant legacy Markdown lesson for migration. Convert its full teaching into HTML, retaining notation, examples, boundaries, and citations. Preserve its `.md` file and existing IDs/submissions. Do not run the sample preview in an existing course directory.

Record a small outcome in progress: node, attempt/time, objective result, open-ended review, evidence path, concise misconception, next action. Save long feedback as a report rather than embedding the transcript. Side-chat findings count only as misconception/remediation information; require separate performance evidence for mastery.
