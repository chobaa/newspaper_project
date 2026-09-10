package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.Article;
import com.newspaper.api_server.domain.Image;
import com.newspaper.api_server.dto.ArticleHomeResponse; // (홈페이지용 DTO)
import com.newspaper.api_server.dto.ArticleResponse; // (아래에서 만들 예정)
import com.newspaper.api_server.dto.ArticleSaveRequest;
import com.newspaper.api_server.repository.ArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import com.newspaper.api_server.dto.ArticlePageResponse;
import com.newspaper.api_server.dto.ArticleSliderResponse;
import com.newspaper.api_server.dto.ArticleSummaryResponse;
import com.newspaper.api_server.dto.HomeSectionsResponse;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final ImageService imageService;

    // 1. 기사 저장 (이미 업로드된 URL들을 연결)
    @Transactional
    public Long saveArticle(ArticleSaveRequest request) {
        String title = request.title() != null ? request.title() : "";
        String category = request.category() != null ? request.category() : "";
        String content = request.content() != null ? request.content() : "";
        String writer = request.writer() != null ? request.writer() : "";

        Article article = new Article(title, category, content, writer);

        if (request.imageUrls() != null && !request.imageUrls().isEmpty()) {
            for (String url : request.imageUrls()) {
                if (url == null || url.isBlank()) continue;
                String originalName = url.contains("/") ? url.substring(url.lastIndexOf("/") + 1) : url;
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

    // 2-1. 홈페이지용 요약 기사 목록 조회 (content 일부만 반환)
    @Transactional(readOnly = true)
    public java.util.List<ArticleHomeResponse> getHomeArticles(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        var pageable = PageRequest.of(0, safeLimit);

        return articleRepository.findAllByOrderByIdDesc(pageable)
                .stream()
                .map(ArticleHomeResponse::from)
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
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("기사가 없습니다. id=" + id));

        // 연관된 이미지 URL을 먼저 스토리지에서 삭제
        if (article.getImages() != null) {
            article.getImages().forEach(img -> {
                String url = img.getUrl();
                if (url != null && !url.isBlank()) {
                    imageService.deleteImageByUrl(url);
                }
            });
        }

        // JPA에서 Article 삭제 시, 연관 Image 엔티티는 orphanRemoval = true 로 자동 삭제
        articleRepository.delete(article);
    }


    // 7. 기사 전체 수정 (제목/카테고리/본문/기자/이미지 포함)
    @Transactional
    public void updateArticle(Long id, ArticleSaveRequest request) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("기사가 없습니다. id=" + id));

        String title = request.title() != null ? request.title() : "";
        String category = request.category() != null ? request.category() : "";
        String content = request.content() != null ? request.content() : "";
        String writer = request.writer() != null ? request.writer() : "";
        article.updateBasic(title, category, content, writer);

        article.clearImages();
        if (request.imageUrls() != null && !request.imageUrls().isEmpty()) {
            for (String url : request.imageUrls()) {
                if (url == null || url.isBlank()) continue;
                String originalName = url.contains("/") ? url.substring(url.lastIndexOf("/") + 1) : url;
                Image image = new Image(url, originalName, article);
                article.addImage(image);
            }
        }
    }

    // =====================================================================
    // 목록/위젯용 경량 조회
    // 본문 전체를 내려보내면 목록 한 번에 수 MB가 오가므로,
    // 아래 메서드들은 요약문 + 썸네일만 담은 DTO를 반환합니다.
    // =====================================================================

    /** 홈 화면: 헤드라인 + 카테고리별 위젯 기사를 한 번에 조회 */
    @Transactional(readOnly = true)
    public HomeSectionsResponse getHomeSections(List<String> categories, int perCategory, int headlineCount) {
        int safePerCategory = clamp(perCategory, 1, 10);
        int safeHeadlineCount = clamp(headlineCount, 1, 10);

        List<ArticleSummaryResponse> headlines = toSummaries(
                articleRepository.findAllByOrderByIdDesc(PageRequest.of(0, safeHeadlineCount)));

        List<HomeSectionsResponse.CategorySection> sections = new ArrayList<>();
        if (categories != null) {
            for (String category : categories) {
                if (category == null || category.isBlank()) continue;
                // 카테고리마다 따로 조회하므로, 최신 기사 쏠림과 무관하게 항상 N건이 채워집니다.
                List<ArticleSummaryResponse> articles = toSummaries(
                        articleRepository.findByCategoryOrderByIdDesc(category, PageRequest.of(0, safePerCategory)));
                sections.add(new HomeSectionsResponse.CategorySection(category, articles));
            }
        }

        return new HomeSectionsResponse(headlines, sections);
    }

    /** 카테고리 목록 / 검색 결과: 서버에서 페이지 단위로 잘라서 반환 */
    @Transactional(readOnly = true)
    public ArticlePageResponse getArticleSummaries(String category, String keyword, String searchType,
                                                   int page, int size) {
        int safePage = Math.max(1, page);
        int safeSize = clamp(size, 1, 50);

        Specification<Article> spec = buildSearchSpec(category, keyword, searchType);
        var pageable = PageRequest.of(safePage - 1, safeSize,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
        var result = articleRepository.findAll(spec, pageable);

        return ArticlePageResponse.of(toSummaries(result.getContent()), result.getTotalElements(), safePage, safeSize);
    }

    /** 상세 페이지 추천 뉴스: 같은 카테고리의 최신 기사 */
    @Transactional(readOnly = true)
    public List<ArticleSummaryResponse> getRelatedArticles(Long id, int limit) {
        int safeLimit = clamp(limit, 1, 10);
        Article article = articleRepository.findById(id).orElse(null);
        if (article == null) return List.of();

        String category = article.getCategory();
        if (category == null || category.isBlank()) return List.of();

        return toSummaries(
                articleRepository.findByCategoryAndIdNotOrderByIdDesc(category, id, PageRequest.of(0, safeLimit)));
    }

    /** 사이드바 슬라이더: 많이 본 뉴스 / 실시간 급상승 (썸네일 이미지가 있는 기사만) */
    @Transactional(readOnly = true)
    public ArticleSliderResponse getSliderArticles(int limit) {
        int safeLimit = clamp(limit, 1, 20);
        // 이미지 없는 기사를 걸러내야 하므로 넉넉히 뽑아온 뒤 잘라냅니다.
        int poolSize = safeLimit * 10;
        var pool = PageRequest.of(0, poolSize);

        LocalDateTime now = LocalDateTime.now();
        List<ArticleSummaryResponse> lastMonth = withImage(
                articleRepository.findByRegDateGreaterThanEqualOrderByViewcountDesc(now.minusDays(30), pool));
        List<ArticleSummaryResponse> base = lastMonth.isEmpty()
                ? withImage(articleRepository.findAllByOrderByViewcountDesc(pool))
                : lastMonth;

        List<ArticleSummaryResponse> today = withImage(
                articleRepository.findByRegDateGreaterThanEqualOrderByViewcountDesc(
                        now.toLocalDate().atStartOfDay(), pool));

        return new ArticleSliderResponse(
                base.stream().limit(safeLimit).toList(),
                (today.isEmpty() ? base : today).stream().limit(safeLimit).toList());
    }

    private Specification<Article> buildSearchSpec(String category, String keyword, String searchType) {
        String trimmedKeyword = keyword == null ? "" : keyword.trim();
        String pattern = "%" + trimmedKeyword + "%";
        String lowerPattern = "%" + trimmedKeyword.toLowerCase() + "%";
        boolean searchTitle = !"content".equals(searchType);
        boolean searchContent = !"title".equals(searchType);

        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (!trimmedKeyword.isEmpty()) {
                var keywordPredicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
                if (searchTitle) keywordPredicates.add(cb.like(cb.lower(root.get("title")), lowerPattern));
                // content 는 @Lob(LONGTEXT) 이라 lower() 를 걸 수 없습니다.
                // DB 콜레이션이 utf8mb4_unicode_ci(대소문자 구분 없음)라 LIKE 만으로 충분합니다.
                if (searchContent) keywordPredicates.add(cb.like(root.get("content"), pattern));
                if (!keywordPredicates.isEmpty()) {
                    predicates.add(cb.or(keywordPredicates.toArray(jakarta.persistence.criteria.Predicate[]::new)));
                }
            }
            return predicates.isEmpty()
                    ? cb.conjunction()
                    : cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private static List<ArticleSummaryResponse> toSummaries(List<Article> articles) {
        return articles.stream().map(ArticleSummaryResponse::from).toList();
    }

    private static List<ArticleSummaryResponse> withImage(List<Article> articles) {
        return articles.stream()
                .map(ArticleSummaryResponse::from)
                // 슬라이더는 큰 이미지를 그대로 쓰기 때문에 실제 사진이 있는 기사만 노출합니다.
                .filter(a -> a.thumbnailUrl() != null && !a.videoThumbnail())
                .toList();
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(value, max));
    }
}
