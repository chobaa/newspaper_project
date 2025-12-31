# 1. 자바 실행 환경(JRE)만 있는 가벼운 이미지를 사용합니다.
FROM eclipse-temurin:17-jdk

# 2. 작업 폴더 설정
WORKDIR /app

# 3. 아까 1단계에서 로컬에 만들어진 jar 파일을 도커 안으로 복사합니다.
# (build/libs 폴더 안에 -SNAPSHOT.jar 로 끝나는 파일 하나를 app.jar로 복사)
COPY build/libs/*-SNAPSHOT.jar app.jar

# 4. 실행 명령어
ENTRYPOINT ["java", "-jar", "app.jar"]