# ===== 1단계: 소스에서 JAR 빌드 =====
FROM eclipse-temurin:17-jdk AS builder
WORKDIR /app

COPY . .
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon -x test

# ===== 2단계: 실행용 이미지 =====
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=builder /app/build/libs/*-SNAPSHOT.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
