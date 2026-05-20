import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint flat config 마이그레이션 중 빌드 시 lint 검사 비활성화
    // (Vercel 배포 시 별도 lint CI 단계에서 실행)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 타입 오류는 tsc --noEmit으로 별도 검증
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
