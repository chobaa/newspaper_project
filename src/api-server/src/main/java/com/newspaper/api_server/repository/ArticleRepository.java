package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long>, JpaSpecificationExecutor<Article> {

    // id 기준 최신순 정렬
    List<Article> findAllByOrderByIdDesc();

    // id 기준 최신순 정렬 + 페이지네이션(홈페이지용 limit)
    List<Article> findAllByOrderByIdDesc(Pageable pageable);

    // 카테고리별 최신순 (홈 위젯: 카테고리마다 항상 N건 채우기)
    List<Article> findByCategoryOrderByIdDesc(String category, Pageable pageable);

    // 상세 페이지 추천 뉴스: 같은 카테고리의 다른 기사
    List<Article> findByCategoryAndIdNotOrderByIdDesc(String category, Long id, Pageable pageable);

    // 사이드바 슬라이더: 기간 내 조회수 상위
    List<Article> findByRegDateGreaterThanEqualOrderByViewcountDesc(LocalDateTime from, Pageable pageable);

    // 사이드바 슬라이더 폴백: 전체 기간 조회수 상위
    List<Article> findAllByOrderByViewcountDesc(Pageable pageable);

    // 제목이 포함된 기사 검색 (수정요청 매칭용)
    java.util.Optional<Article> findFirstByTitleContainingOrderByIdDesc(String titlePart);
}
