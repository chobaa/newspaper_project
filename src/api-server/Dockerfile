# 1. 자바 17 실행 환경이 설치된 리눅스를 베이스로 사용
FROM openjdk:17-jdk-slim

# 2. 작업할 폴더 위치 설정
WORKDIR /app

# 3. 빌드된 JAR 파일을 도커 이미지 안으로 복사
# (나중에 Github Actions가 빌드한 파일이 build/libs에 생깁니다)
COPY build/libs/*.jar app.jar

# 4. 컨테이너가 시작될 때 실행할 명령어
ENTRYPOINT ["java", "-jar", "app.jar"]