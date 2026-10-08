# Independent help without derailing the course

Keep the main chat responsible for the course, milestones, and progress. Use a separate conversation for local explanation and exploration. Do not promise that creating a new conversation erases tokens already spent or guarantees a particular client's context inheritance.

## Entry points

Provide a floating help button on every lesson and practice page and an inline button on each section/question. Let the learner select a passage and use the floating button to ask about it. Preserve scroll position, quiz draft, and existing learning progress when the help dialog opens/closes.

The bundled dialog prepares a prompt containing the unit goal, relevant prior knowledge, node and section/question ID, absolute artifact path, a quote of at most 800 characters, and the learner's question. It does not include the whole lesson, full profile, answer key, current answers, or conversation transcript.

## Capability-aware handoff

1. Use a native side-chat facility when the current client actually exposes it. Follow its documented interface and access rules. Do not invent tool names, `codex://` creation URLs, JavaScript globals, or browser-to-chat APIs.
2. The bundled static page uses an explicit copy/paste handoff: prepare a prompt, copy `/side <prompt>`, paste it into the Codex composer, and send. The page clearly states that it has prepared a command, not opened a conversation. Offer plain-prompt copy for clients where the command is unavailable. Check current capability before promising native behavior.
3. If native side chat is unavailable, the learner can open a separate chat and paste the minimal prompt. If the learner explicitly asks the agent to create that chat, use an available `create_thread` tool with only the minimal prompt and the appropriate project; follow its task-creation rules. Creating chat or sending messages requires the user's applicable explicit authorization; this skill does not supply it. Do not automatically create a sidebar chat for every lesson.
4. Avoid full-history forks for routine explanation: the minimal prompt is better suited to context isolation. A visual dialog in the HTML page is a question composer, not an AI response service. Never display scripted text as if an agent has answered live.

Official OpenAI guidance describes `/side [question]` and selected-text side chat, with availability depending on client/host/account: [Codex Remote guide](https://developers.openai.com/blog/mastering-codex-remote-for-engineering). This guidance was checked on 2026-10-08. It does not establish that static HTML can launch native chats. Reverify if relying on a newer host integration; the copyable plain prompt remains portable.

## Help-agent contract

Include the following behavior in the isolated help prompt:

- Address the local question and bridge from the stated prior knowledge. Use a concise example or counterexample; expand when the learner needs it.
- Read only the linked artifact and relevant section when more context is needed. Do not scan all course files or conversation logs.
- During a practice attempt, offer reasoning hints by default. Do not read the answer key or reveal the full answer unless explicitly asked. Disclose use of full solutions if they later matter to assessing evidence.
- Do not overwrite `profile.md`, `graph.json`, `plan.md`, or `progress.json`. Do not change the main sequence or mark mastery. Do not message the main chat without the required human authorization.
- Offer an optional merge-back summary only if the finding affects the course: an important misconception, missing prerequisite, incorrect lesson, or changed next action.
- Keep that summary to at most three bullets, about 160 Chinese characters total (or comparably short in another language). Include the node/section, the relevant correction, and any unresolved issue. Do not claim a concept is mastered merely because an explanation was given.

Do not rigidly truncate the help answer itself to save tokens; isolate it so adequate explanation remains possible.

## Merge back only useful learning evidence

Leave resolved curiosity in the help chat. For an actionable finding, let the learner copy its small summary back or explicitly authorize a message to the main chat. The main agent reads only that summary, then records a brief misconception/remediation note or corrects the relevant lesson section. It reads the longer exchange only if needed to verify a disputed conclusion.

If help notes are saved, use `knowbridge/help/<node>-<question-id>.md` or JSON, separate from progress. Include a short `summary`, optional source anchor, and unresolved status; do not automatically save every turn. Read only summaries when resuming.

Continue the main workflow from its existing bookmark and next action. A help question alone must not restart diagnosis or invalidate the plan. If a real prerequisite gap is established, perform targeted remediation and replan only the affected nodes. Do not mark later nodes mastered until the missing requirements are satisfied.
