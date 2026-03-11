# US LOG (Supabase + Next.js)

Supabase 공식 Next.js Quickstart 구조(`@supabase/ssr`) 기준으로 인증/세션 구성을 맞춘 사진 추억 앱입니다.

## 1) 환경변수

프로젝트 루트 `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# 호환용: PUBLISHABLE_KEY 대신 아래를 써도 동작
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- Quickstart 기준은 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 입니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 영상 워커(`worker:videos`) 실행에 필요합니다.

## 2) Supabase SQL 실행

Supabase SQL Editor에서 아래 파일 실행:

- `supabase/schema.sql`

그 다음, 로그인한 유저를 커플에 연결:

```sql
insert into public.couples (name) values ('우리 둘') returning id;

insert into public.couple_members (couple_id, user_id, role)
values ('위에서_생성한_couple_id', 'auth.users.id', 'owner')
on conflict (couple_id, user_id) do nothing;
```

## 3) 실행

```bash
bun dev
```

브라우저에서 `http://localhost:3000` 접속 후 로그인하면,
서버가 로그인 유저 기준으로 `couple_members`를 조회해 추억을 저장/조회합니다.

## 4) 영상 워커 실행 (MVP 1단계)

영상 작업은 API에서 `video_jobs`를 `queued`로 넣고, 워커가 실제 mp4를 생성합니다.

```bash
# 한 번만 처리
bun run worker:videos:once

# 지속적으로 큐 감시 (기본 10초 간격)
bun run worker:videos
```

옵션:

```bash
bun run src/worker/video-worker.ts --interval 5
```

주의:
- 로컬/서버에 `ffmpeg` 설치가 필요합니다.
- 워커는 `SUPABASE_SERVICE_ROLE_KEY`를 사용해 `video_jobs/videos/storage`를 업데이트합니다.

## 인증 구조 (Quickstart 방식)

- `src/utils/supabase/client.ts`: 브라우저용 클라이언트
- `src/utils/supabase/server.ts`: 서버 컴포넌트/라우트용 클라이언트
- `src/utils/supabase/middleware.ts`: 세션 갱신
- `middleware.ts`: 모든 요청에서 세션 업데이트
