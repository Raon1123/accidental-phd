#!/usr/bin/env bash
# Creates or updates the label set from docs/workflow.md. Idempotent.
set -euo pipefail
REPO="${1:-Raon1123/accidental-phd}"
mk() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null && echo "label: $1"; }
for n in 0 1 2 3 4 5 6; do mk "wave/$n" "0E8A16" "Wave $n 작업"; done
for a in taxonomy schools departments venues salaries statistics narratives engine ui workflow docs; do mk "area/$a" "1D76DB" "영역: $a"; done
mk claimed       "FBCA04" "누군가 진행 중 (assignee + claimed 댓글)"
mk blocked       "B60205" "외부 요인으로 막힘"
mk needs-judge   "5319E7" "모호한 판정, fable/Astra 재판정 필요"
mk stale         "C5DEF5" "7일 무활동, 재claim 가능"
mk chatgpt-ready "BFD4F2" "ChatGPT 프롬프트로 바로 수행 가능"
