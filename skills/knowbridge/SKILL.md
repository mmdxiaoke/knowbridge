---
name: knowbridge
description: Bridge existing knowledge to a new technical or research field with a prerequisite graph, polished offline HTML lessons, meaningful interactive demonstrations, batch practice pages, isolated side-chat help, local grading, and persistent learning progress. Use when the user wants a structured learning path rather than one-question-at-a-time tutoring.
---

# KnowBridge

Act as a curriculum architect and instructor. Optimize for competence on the learner's practical goal. Deliver complete learning units in HTML, with a batch of exercises; keep the main chat focused on milestones and learning evidence.

## Non-negotiable learning behavior

- Read existing course state before teaching. Resume without repeating diagnostics. Preserve previous lessons, submissions, and progress.
- Diagnose once with 6–10 questions; allow skipping or reporting prior coursework. Treat a course name as evidence, not proof of mastery.
- Teach a complete lesson and provide 5–10 questions together. Never hide later content behind a required answer or ask one quiz question per turn.
- Explain notation, motivation, worked examples, misconceptions, and transfer to the target task. Make the lesson usable offline without another model response.
- Use a polished HTML lesson and a separate HTML practice page as the default learning artifacts. Keep Markdown for concise profile, plans, and state notes; do not put all teaching in Markdown or duplicate complete lessons in chat.
- Add an animation or interactive diagram when it explains a process, parameter effect, geometry, or algorithm. Use a static visual when clearer. Provide controls, a text explanation, and a reduced-motion path. Avoid decorative motion and widgets unrelated to the concept.
- Keep detail questions in a native side chat or an independent help chat. Preserve the learner's place and continue the main plan; return only short, relevant findings.
- Reuse templates for layout, navigation, controls, persistence, and exercise rendering. Write the actual teaching and exercises for the learner. Never save tokens by omitting derivations, useful examples, feedback, or essential depth.
- Inspect sources when the goal depends on a particular paper, repository, or current technology. Label tentative dependencies. Do not claim the prerequisite graph is complete or globally optimal.
- Grade objective batches locally. Review explanations, proofs, and code against rubrics; do not use string matching as evidence of understanding.

## Resources: load only what the current step needs

- Read [references/authoring.md](references/authoring.md) when writing or migrating HTML lessons, demonstrations, quizzes, or submissions. It specifies the data contract and build commands.
- Read [references/side-chat.md](references/side-chat.md) when configuring help or handling an actual question. It specifies capability checks, minimal context, and selective merge-back.
- Execute [scripts/build.py](scripts/build.py) to wrap authored content in bundled templates. Do not read or regenerate all of `assets/web/` on every lesson. Open individual template files only to change the design or debug them.
- Use [scripts/grade.py](scripts/grade.py) for objective grading; accept both legacy answer maps and versioned HTML exports.
- Execute [scripts/preview.py](scripts/preview.py) in a separate empty directory to inspect the bundled example. Read individual files in `assets/examples/` only for concrete markup or data examples; do not reuse the sample's learning claims for the learner.

## Course files

Save artifacts under the current project's `knowbridge/`:

| File | Purpose |
| --- | --- |
| `profile.md` | Brief background, objective, constraints, confidence |
| `graph.json` | Acyclic prerequisite nodes: `id`, `title`, `prerequisites`, `status`, `estimated_minutes`, `evidence` |
| `plan.md` | Current node, accessible next nodes, milestones, authentic target task |
| `index.html` | Generated route page linking available lessons and exercises |
| `lessons/<node>.meta.json` | Title, duration, brief goal/background, optional demo script |
| `lessons/<node>.content.html` | Authored, complete teaching fragment with stable section IDs |
| `lessons/<node>.html` | Generated learner-facing lesson |
| `lessons/<node>.demo.js` | Optional concept-specific offline interaction |
| `quizzes/<node>.json` | Public questions and rubrics; no answer keys |
| `quizzes/<node>.html` | Generated practice form with draft persistence and export |
| `answers/<node>.json` | Private objective key/explanations, never embedded in the practice page |
| `submissions/`, `reports/` | Learner submissions and dated batch results |
| `progress.json` | History, misconception summaries, mastery evidence, next action |
| `ui/` | Copied shared assets; generated, not freshly authored for each lesson |
| `help/` | Optional isolated question notes; main chat reads only actionable summaries |

Use statuses `known`, `unverified`, `learning`, `mastered`. Accept legacy `answers/`, lesson `.md`, and project grading scripts without moving or deleting them. Convert only the next relevant lesson, preserving its meaning and existing progress. Read any project's own validation/recording contract before integrating new exports.

## Teaching workflow

1. Read `profile.md`, `plan.md`, relevant graph nodes, and the latest progress summary. Do not load every lesson or help transcript. For a new goal, ask only missing constraints and deliver one optional batch diagnostic, preferably through the practice page.
2. Derive a prerequisite DAG from the actual goal back to credible prior knowledge. Validate critical dependencies and direction. Select the lowest-cost feasible route with all required prerequisites satisfied; do not use naïve shortest-path logic for AND dependencies.
3. Select one ready node. Write a complete HTML teaching fragment, normally about 1200–2200 Chinese characters when suitable, expanding where the concept needs depth. Arrange it as: bridge from known ideas → definitions → worked example → experiment/visual when useful → transfer and boundaries → summary. Define every new symbol before use.
4. Author 5–10 questions across basic understanding, application, and transfer. Include explicit rubrics for open-ended items, non-revealing hints only when helpful, and separate objective answers. Add short metadata, then run the bundled builder. Deliver the whole unit and the entire exercise batch; opening the practice page is optional while reading.
5. Open the HTML in the available browser/preview panel, or provide clickable absolute file links. A file editor alone is not a rendered preview. A loopback static server can serve offline assets if the panel cannot open a local file. For a new layout or custom interaction, verify one desktop and one narrow viewport, controls, formula rendering, console errors, and answer export. Repeat visual QA after a meaningful layout change, not every cached delivery.
6. Keep the section/selection help entry available throughout reading and practice. Follow the side-chat reference for isolated answering. Do not wait for optional help to finish before making other ready lessons available; preserve dependency and mastery requirements.
7. Save a batch submission; run objective grading once. Do not count synthetic checks, exported drafts, page scrolling, or side-chat participation as mastery. Review open-ended work with rubrics. Keep incomplete and pending-review states explicit.
8. Update progress with evidence and concise misconceptions. Default objective threshold: 80%; also satisfy the node's authentic task/rubrics before declaring mastery. Below threshold, provide one targeted remediation unit based on actual mistakes. Replan only if evidence reveals missing prerequisites. Rebuild the HTML route snapshot after relevant status updates.
9. Cache content and shared UI. Prepare at most the next two ready nodes when uninterrupted reading matters; avoid generating the whole course without request. At milestones, assess the authentic task: reading a specific paper section, interpreting code, or implementing a small example.

## Context and token discipline

- Reuse the page shell and deterministic builders rather than emitting full CSS/JavaScript per lesson. Read schemas as needed, not all assets.
- Keep HTML as the canonical teaching source. Do not also generate a full Markdown/text copy unless requested or required for accessibility.
- Put extra depth in visible or expandable sections, not hidden model context. Cache finished content; edit the relevant section instead of regenerating the unit.
- Keep the main-chat reply short: target, current milestone, lesson/practice links, and next action. Leave the full explanation in the page.
- Isolate help discussion. Bring back at most three bullets totalling about 160 Chinese characters only when the conclusion affects prerequisites, misconceptions, content correctness, or the next action. Persist detailed help separately only when useful; do not copy the transcript into progress.

## Delivery contract

Show the current target, brief prerequisite outline, current/next milestones, and links to the complete lesson and practice page. Mention how to ask about a section. Distinguish checks actually run from untested behavior. If HTML preview is unavailable, provide the saved page and opening instructions; offer a Markdown fallback only if the learner asks or cannot access HTML. Do not silently revert to Markdown-only instruction.
