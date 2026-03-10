# US LOG (Supabase + Next.js MVP)

여자친구와 함께 사진을 저장하고, 자동 타임라인 + 지도에서 추억을 보는 앱 MVP입니다.

## 1) 환경변수

프로젝트 루트에 `.env.local` 파일 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_DEMO_COUPLE_ID=...
```

- `NEXT_PUBLIC_DEMO_COUPLE_ID`는 `couples.id` UUID입니다.
- 현재 MVP는 서버 API에서 `SERVICE_ROLE_KEY`로 저장/조회합니다. (빠른 시연 목적)

## 2) Supabase SQL 실행

Supabase SQL Editor에서 아래 파일 실행:

- `supabase/schema.sql`

실행 후 샘플 데이터:

```sql
insert into public.couples (name) values ('우리 둘') returning id;
```

반환된 `id`를 `.env.local`의 `NEXT_PUBLIC_DEMO_COUPLE_ID`에 넣으면 됩니다.

## 3) 실행

```bash
bun dev
```

`http://localhost:3000`

## 핵심 동작

1. 사진 선택 시 EXIF(GPS/촬영시간)를 자동 파싱
2. 업로드 시 Storage(`photos` 버킷)에 파일 저장
3. 같은 날짜 기준으로 `memories` 타임라인 자동 생성(upsert)
4. `latitude/longitude`가 있으면 지도(Leaflet)에 핀 표시
