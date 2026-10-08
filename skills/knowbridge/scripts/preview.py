#!/usr/bin/env python3
"""Create an isolated, fully functional template example; never write learner progress."""
import argparse
import json
import shutil
import sys
from pathlib import Path
from build import build


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", help="A new empty preview directory, outside the real course")
    args = parser.parse_args()
    root = Path(args.output).resolve()
    if root.exists() and any(root.iterdir()):
        parser.exit(1, "Preview output must be new or empty; existing work was left untouched.\n")
    examples = Path(__file__).resolve().parents[1] / "assets" / "examples"
    for directory in ("lessons", "quizzes", "answers"):
        (root / directory).mkdir(parents=True, exist_ok=True)
    for name in ("mix.meta.json", "mix.content.html"):
        shutil.copyfile(examples / name, root / "lessons" / name)
    shutil.copyfile(examples / "mix.quiz.json", root / "quizzes" / "mix.json")
    shutil.copyfile(examples / "mix.answers.json", root / "answers" / "mix.json")
    print(json.dumps(build(root, "mix", preview=True), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
