# 세계로교회 2027 대대·교구 뽑기

Vercel에서 운영하던 **LIVE 3.0** 웹 추첨 시스템의 Codex 개발 저장소입니다.

> **보안 안내**: 이 저장소는 현재 PUBLIC 입니다. 실명 명단, 관리자/방송실 접근 키, 실제 DB URL, 서비스 키, 백업 파일을 커밋하지 마세요. 실제 배포·명단 복원 전 반드시 GitHub 저장소를 Private으로 변경하세요.

## 현재 상태

- UI: 2027년 대대 추첨 진행, 방송 송출, 관리자 설정, 단계·호명 순서 변경, CSV 양식/업로드, 결과 초기화
- 배포: Vercel `segero-draw-mvp` 프로젝트의 LIVE 3.0 **미리보기**가 존재함. 기존 운영 도메인에 무단 배포 금지
- 백엔드: 기존에는 Vercel Blob 단일 JSON 덮어쓰기였으며 연속 추첨 시 '자동저장 충돌' 오류가 발생
- 데이터: 저장소에는 개인정보 없는 예시 명단만 포함. 기존 2026년 실명 데이터는 서버 저장소/별도 구글시트에 보관하되 GitHub에 공개하지 않음

## 로컬 실행

Node.js 20 이상:

```bash
npm install
npx vercel dev
```

`vercel dev` 또는 배포 환경에서만 `/api/state` 서버 함수가 동작합니다. 실제 키는 Vercel 환경변수에만 설정하세요.

`DRAW_ADMIN_KEY`, `DRAW_VIEW_KEY`, `BLOB_READ_WRITE_TOKEN` (기존 Blob 이용 중) 환경변수가 필요합니다. 이 키의 실제 값을 문서나 GitHub에 기록하지 마세요.

## Codex 시작

[CODEX_TASK.md](./CODEX_TASK.md)를 먼저 읽고, 재현 테스트를 작성한 뒤 저장·동시성 구조를 안정화하세요. 변경사항은 별도 브랜치/PR에서 검토하고, 운영 주소는 유지하세요.

## 원본

- Vercel 프로젝트: `segero-draw-mvp`
- 미리보기 LIVE 3.0: https://segero-draw-gjx77cdux-sumin1766-7023.vercel.app/
- 기존 운영: https://segero-draw-mvp.vercel.app/

