# Netlify 배포 가이드

이 문서는 Netlify에 Rust와 TypeScript를 사용한 Gatsby-Notion 프로젝트를 배포하는 방법에 대한 안내입니다.

## 사전 준비사항

1. Netlify 계정
2. GitHub에 푸시된 프로젝트 코드
3. Notion API 키

## 배포 단계

### 1. Netlify에 새 사이트 추가

1. Netlify 대시보드에서 "New site from Git" 버튼 클릭
2. 코드가 있는 Git 저장소 선택
3. 빌드 설정은 자동으로 `netlify.toml`에서 가져옵니다

### 2. 환경 변수 설정

Netlify 사이트 대시보드에서 다음 환경 변수를 설정해야 합니다:

1. `Site settings` > `Build & deploy` > `Environment` > `Environment variables` 이동
2. 다음 변수 추가:
   - `NOTION_API_KEY` - Notion API 키
   - `GATSBY_INTEGRATION_TOKEN` - Notion API 통합 토큰 (NOTION_API_KEY와 같은 값 사용 가능)
   - 그 외 필요한 환경 변수들 (데이터베이스 ID 등)

### 3. 빌드 캐시 설정 (선택사항)

빌드 성능을 향상시키기 위해 캐시 설정을 활성화할 수 있습니다.

1. `Site settings` > `Build & deploy` > `Continuous Deployment` > `Build settings` 이동
2. `Build image selection` - "Ubuntu Focal 20.04" 선택
3. `Cache artifacts` 옵션을 활성화

## 문제 해결

### Rust 빌드 실패 시

Rust 빌드가 실패해도 TypeScript 폴백 구현으로 자동 전환됩니다. 빌드 로그에서 다음 메시지를 확인할 수 있습니다:
```
Rust build failed, using TypeScript fallback
```

### 빌드 시간 초과

Netlify의 기본 빌드 시간은 15분입니다. Rust 컴파일이 오래 걸리는 경우 시간이 초과될 수 있습니다.

1. `Site settings` > `Build & deploy` > `Build settings` 이동
2. `Build timeout` 값을 늘립니다 (예: 30분)

### 캐시 문제

빌드 캐시가 문제를 일으키는 경우 다음 방법으로 해결할 수 있습니다:

1. Netlify 사이트 대시보드에서 `Deploys` 탭 이동
2. `Trigger deploy` 버튼 클릭
3. `Clear cache and deploy site` 선택

## 참고 사항

- Rust 컴파일은 첫 번째 빌드에서 시간이 많이 소요될 수 있습니다 (약 5-10분)
- 이후 빌드는 캐시 덕분에 더 빠르게 완료됩니다
- 메모리 사용량이 높을 수 있으니 Netlify의 빌드 제한을 확인하세요 