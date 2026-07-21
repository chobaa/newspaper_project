package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {

    // id 기준 최신순 정렬
    List<Article> findAllByOrderByIdDesc();

    // id 기준 최신순 정렬 + 페이지네이션(홈페이지용 limit)
    List<Article> findAllByOrderByIdDesc(Pageable pageable);

    // 제목이 포함된 기사 검색 (수정요청 매칭용)
    java.util.Optional<Article> findFirstByTitleContainingOrderByIdDesc(String titlePart);
}