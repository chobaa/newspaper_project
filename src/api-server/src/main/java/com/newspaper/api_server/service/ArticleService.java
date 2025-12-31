package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.repository.ArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor // Repository를 자동으로 주입(DI)해줍니다.
public class ArticleService {

    private final ArticleRepository articleRepository;

    @Transactional // "이 함수가 끝날 때까지 에러 없으면 커밋, 에러나면 롤백해라"
    public Long saveArticle(ArticleSaveRequest request) {
        // 1. DTO -> Entity 변환
        Article article = new Article(
                request.title(),
                request.content(),
                request.writer()
        );

        // 2. DB 저장 (INSERT SQL 자동 실행)
        Article savedArticle = articleRepository.save(article);

        // 3. 저장된 ID 반환
        return savedArticle.getId();
    }
}