package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.domain.Image;
import com.newspaper.api_server.dto.ArticleResponse; // (아래에서 만들 예정)
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.repository.ArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;

    // 1. 기사 저장 (이미 업로드된 URL들을 연결)
    @Transactional
    public Long saveArticle(ArticleSaveRequest request) {
        Article article = new Article(
                request.title(),
                request.category(),
                request.content(),
                request.writer()
        );

        // 프론트엔드에서 받은 URL 리스트를 순회하며 Image 엔티티 생성
        if (request.imageUrls() != null && !request.imageUrls().isEmpty()) {
            for (String url : request.imageUrls()) {
                // URL에서 파일명 추출 (단순 저장용)
                String originalName = url.substring(url.lastIndexOf("/") + 1);

                Image image = new Image(url, originalName, article);
                article.addImage(image);
            }
        }

        return articleRepository.save(article).getId();
    }

    // 2. 전체 기사 목록 조회 (최신순)
    @Transactional(readOnly = true)
    public java.util.List<ArticleResponse> getArticles() {
        return articleRepository.findAllByOrderByIdDesc()
                .stream()
                .map(ArticleResponse::from)
                .toList();
    }

    // 3. 기사 상세 조회 (조회수 증가 포함)
    @Transactional
    public ArticleResponse getArticle(Long id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("기사가 없습니다. id=" + id));

        // 조회수 1 증가 (Dirty Checking으로 자동 DB 반영)
        article.increaseViewCount();

        return ArticleResponse.from(article);
    }

    // 4. 기사 삭제
    @Transactional
    public void deleteArticle(Long id) {
        articleRepository.deleteById(id);
    }

    // 5. 기사 본문만 수정 (수정요청 메일 처리용)
    @Transactional
    public void updateContent(Long id, String newContent) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("기사가 없습니다. id=" + id));
        article.updateContent(newContent);
    }

    // 6. 제목 포함 검색 (수정요청 매칭용)
    @Transactional(readOnly = true)
    public java.util.Optional<Article> findFirstByTitleContainingOrderByIdDesc(String titlePart) {
        return articleRepository.findFirstByTitleContainingOrderByIdDesc(titlePart);
    }
}