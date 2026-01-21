# Node.js + Chrome for Selenium - Multi-stage build
FROM node:20-slim AS builder

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 빌드 시 환경변수 - 실제 값으로 하드코딩 (NEXT_PUBLIC은 빌드 시 필요)
ENV NEXT_PUBLIC_SUPABASE_URL=https://vumjtbwsbrkdhstwgjkw.supabase.co
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder_for_build
ENV NEXTAUTH_SECRET=build-time-secret
ENV NEXTAUTH_URL=https://truckwriter3.onrender.com

# 빌드
RUN npm run build

# ============ 런타임 이미지 ============
FROM node:20-slim

# 필수 패키지 및 Chrome 설치
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    unzip \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Chrome 설치
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# ChromeDriver 설치
RUN CHROME_VERSION=$(google-chrome --version | grep -oP '\d+\.\d+\.\d+') \
    && wget -q "https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}.0/linux64/chromedriver-linux64.zip" -O /tmp/chromedriver.zip \
    && unzip /tmp/chromedriver.zip -d /tmp \
    && mv /tmp/chromedriver-linux64/chromedriver /usr/bin/chromedriver \
    && chmod +x /usr/bin/chromedriver \
    && rm -rf /tmp/chromedriver* \
    || echo "ChromeDriver download failed, will use fallback"

WORKDIR /app

# 빌드 결과물 복사
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# 런타임 환경변수 (Supabase URL은 빌드 시 이미 JS에 박혀있음)
ENV NODE_ENV=production
ENV CHROME_PATH=/usr/bin/google-chrome
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

# 포트 설정
EXPOSE 3000

# 실행
CMD ["npm", "start"]
