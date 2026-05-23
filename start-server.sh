#!/bin/bash
# sandbox에 OPENAI_BASE_URL(genspark proxy)이 시스템 환경변수로 주입되어 있어
# sk-proj 키가 프록시에서 401을 받는 문제를 방지하기 위해 명시적으로 unset
unset OPENAI_BASE_URL
unset OPENAI_API_KEY

# 직접 키 설정 (실제 openai.com 사용)
export OPENAI_API_KEY="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"
export OPENAI_MODEL="gpt-4o"
# OPENAI_BASE_URL 미설정 = OpenAI SDK가 기본값(https://api.openai.com/v1) 사용

exec node_modules/.bin/next start --port 3000
