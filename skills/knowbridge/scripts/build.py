#!/usr/bin/env python3
"""Build offline KnowBridge lesson, practice and route pages with bundled templates."""
import argparse
import hashlib
import html
import json
import math
import re
import shutil
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / "assets" / "web"
SAFE_ID = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\Z")
TYPES = {"single_choice", "multi_choice", "numeric", "open_ended"}
STATUSES = {"known": "已有基础", "unverified": "待验证", "learning": "学习中", "mastered": "已掌握"}


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()[:16]


def json_script(value):
    return json.dumps(value, ensure_ascii=False).replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


class LessonCheck(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.sections = 0
        self.section_depth = 0
        self.has_heading = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "iframe", "object", "embed", "base", "html", "head", "body"} or any(a.startswith("on") for a in attrs):
            raise ValueError("Use a local meta.demo_script for JavaScript, not inline scripts, embeds or event attributes.")
        if any(str(value).strip().lower().startswith(("javascript:", "vbscript:")) for key, value in attrs.items() if key in {"href", "src"}):
            raise ValueError("Script URLs are not allowed in lesson content.")
        if "id" in attrs:
            if not SAFE_ID.fullmatch(attrs["id"]) or attrs["id"] in self.ids:
                raise ValueError("Lesson IDs must be unique safe identifiers: " + attrs["id"])
            self.ids.add(attrs["id"])
        if tag == "section":
            if self.section_depth:
                raise ValueError("Use top-level sections and divs within them; do not nest section anchors.")
            if "id" not in attrs:
                raise ValueError("Each lesson section needs a stable id for side-chat context.")
            self.sections += 1
            self.section_depth = 1
            self.has_heading = False
        if tag == "h2" and self.section_depth:
            self.has_heading = True

    def handle_endtag(self, tag):
        if tag == "section":
            if not self.section_depth or not self.has_heading:
                raise ValueError("Each top-level section needs an h2 heading and closing tag.")
            self.section_depth = 0


def validate_quiz(quiz, node):
    if quiz.get("node_id") != node:
        raise ValueError("Quiz node_id does not match the requested node.")
    questions = quiz.get("questions", [])
    if not 5 <= len(questions) <= 10:
        raise ValueError("Provide one complete batch of 5–10 questions.")
    ids = set()
    for q in questions:
        qid = q.get("id", "")
        if not SAFE_ID.fullmatch(qid) or qid in ids:
            raise ValueError("Question IDs must be safe and unique.")
        ids.add(qid)
        if q.get("type") not in TYPES or not isinstance(q.get("prompt"), str) or not q["prompt"].strip():
            raise ValueError("Question needs a supported type and a nonempty prompt.")
        if any(key in q for key in ("answer", "correct", "solution", "explanation", "value")):
            raise ValueError("Keep answer keys and explanations out of the public quiz.")
        if q["type"] in {"single_choice", "multi_choice"}:
            options = q.get("options")
            if not isinstance(options, dict) or len(options) < 2 or not all(SAFE_ID.fullmatch(k) and isinstance(v, str) for k, v in options.items()):
                raise ValueError("Choice questions need at least two keyed text options.")
        if q["type"] == "open_ended" and not q.get("rubric"):
            raise ValueError("Open-ended questions need an explicit rubric.")
        if q["type"] == "numeric":
            tolerance = q.get("tolerance", 0)
            if isinstance(tolerance, bool) or not isinstance(tolerance, (float, int)) or not math.isfinite(tolerance) or tolerance < 0:
                raise ValueError("Numeric tolerance must be finite and nonnegative.")


def render(template, values):
    source = (ASSETS / template).read_text(encoding="utf-8")
    tokens = re.findall(r"@@([A-Z_]+)@@", source)
    missing = set(tokens) - values.keys()
    if missing:
        raise ValueError("Missing template values: " + ", ".join(sorted(missing)))
    return re.sub(r"@@([A-Z_]+)@@", lambda match: values[match[1]], source)


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def build(root, node, preview=False):
    root = Path(root).resolve()
    if not SAFE_ID.fullmatch(node):
        raise ValueError("Use a safe node identifier, without slashes or '..'.")
    meta_path = root / "lessons" / f"{node}.meta.json"
    meta = read_json(meta_path)
    if meta.get("node_id") != node:
        raise ValueError("Lesson metadata node_id does not match.")
    content = (root / "lessons" / f"{node}.content.html").read_text(encoding="utf-8-sig")
    check = LessonCheck(); check.feed(content)
    if not check.sections or check.section_depth:
        raise ValueError("Write a standalone lesson in named <section> elements.")
    quiz = read_json(root / "quizzes" / f"{node}.json"); validate_quiz(quiz, node)
    context = meta.get("context", {})
    if not isinstance(context, dict) or not isinstance(context.get("objective"), str) or not context["objective"].strip():
        raise ValueError("Supply a short context.objective for the lesson and side-chat handoff.")
    lesson_path = root / "lessons" / f"{node}.html"
    quiz_path = root / "quizzes" / f"{node}.html"
    context = {**context, "lesson_path": str(lesson_path), "quiz_path": str(quiz_path), "quiz_source_path": str(root / "quizzes" / f"{node}.json")}
    for name, limit in (("objective", 260), ("background", 200)):
        context[name] = str(context.get(name, ""))[:limit]
    course_id = fingerprint(str(root))
    common = {"node_id": node, "title": str(meta["title"]), "subtitle": str(meta.get("subtitle", "")), "course_id": course_id, "context": context}
    lesson_data = {**common, "page_kind": "lesson", "lesson_fingerprint": fingerprint({"content": content, "meta": meta})}
    quiz_data = {**common, "page_kind": "quiz", "quiz": quiz, "quiz_fingerprint": fingerprint(quiz)}
    shared = {"TITLE": html.escape(common["title"]), "NODE": node, "SIDECHAT": (ASSETS / "sidechat.html").read_text(encoding="utf-8")}
    demo_script = meta.get("demo_script")
    custom = ""
    script_source = None
    if demo_script:
        if demo_script != f"{node}.demo.js":
            raise ValueError("Use a node-local '<node>.demo.js' filename for custom demos.")
        script_source = root / "lessons" / demo_script
        if not script_source.is_file():
            raise ValueError("Custom demo script is missing.")
        custom = f'<script defer src="../ui/demos/{demo_script}"></script>'
    lesson_html = render("lesson.html", {**shared, "DATA": json_script(lesson_data), "CONTENT": content, "KICKER": html.escape(str(meta.get("kicker", "LEARN / 知识桥梁"))), "SUBTITLE": html.escape(common["subtitle"]), "MINUTES": html.escape(str(meta.get("estimated_minutes", 20))), "LEVEL": html.escape(str(meta.get("level", "基础与迁移"))), "CUSTOM_SCRIPT": custom})
    quiz_html = render("quiz.html", {**shared, "DATA": json_script(quiz_data)})
    graph = read_json(root / "graph.json") if (root / "graph.json").exists() else {}
    nodes = graph if isinstance(graph, list) else graph.get("nodes", [])
    statuses = {n["id"]: n.get("status", "unverified") for n in nodes}
    cards = []
    for path in sorted((root / "lessons").glob("*.meta.json")):
        item = read_json(path); item_id = item.get("node_id", "")
        if not SAFE_ID.fullmatch(item_id):
            continue
        if item_id != node and not ((root / "lessons" / f"{item_id}.html").is_file() and (root / "quizzes" / f"{item_id}.html").is_file()):
            continue
        status = STATUSES.get(statuses.get(item_id, "unverified"), "待验证")
        cards.append(f'<article class="course-card"><span class="pill">{status}</span><h3>{html.escape(str(item["title"]))}</h3><p>{html.escape(str(item.get("subtitle", "")))}</p><div class="meta-row"><span>{html.escape(str(item.get("estimated_minutes", 20)))} 分钟</span><span>{html.escape(str(item.get("level", "基础与迁移")))}</span></div><div class="button-row"><a class="button primary" href="lessons/{item_id}.html">进入课程 →</a><a class="button" href="quizzes/{item_id}.html">练习</a></div></article>')
    snapshot = "界面示例：这里的课程内容与作答不计入你的正式学习记录。" if preview else "状态快照：" + datetime.now(timezone.utc).isoformat(timespec="seconds") + "；新的批改记录由学习助手更新后重建页面。"
    index_html = render("index.html", {"DATA": json_script({"page_kind": "index", "course_id": course_id}), "OBJECTIVE": html.escape(context["objective"]), "COUNT": str(len(cards)), "CARDS": "\n".join(cards), "SNAPSHOT": html.escape(snapshot)})
    # Build derived pages only. Never touch keys, submissions or learner state.
    ui = root / "ui"; ui.mkdir(parents=True, exist_ok=True)
    for name in ("styles.css", "common.js", "lesson.js", "quiz.js", "demos.js"):
        shutil.copyfile(ASSETS / name, ui / name)
    if script_source:
        (ui / "demos").mkdir(exist_ok=True); shutil.copyfile(script_source, ui / "demos" / demo_script)
    write(lesson_path, lesson_html); write(quiz_path, quiz_html); write(root / "index.html", index_html)
    return {"lesson": str(lesson_path), "quiz": str(quiz_path), "index": str(root / "index.html"), "quiz_fingerprint": fingerprint(quiz), "preview": preview}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", help="Course's knowbridge directory")
    parser.add_argument("node", help="Node identifier")
    parser.add_argument("--preview", action="store_true", help="Label isolated example output; do not use for learner records")
    args = parser.parse_args()
    try:
        result = build(args.root, args.node, args.preview)
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, f"Build failed: {error}\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
