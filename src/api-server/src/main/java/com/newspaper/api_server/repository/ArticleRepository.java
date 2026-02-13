package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {

    // id 기준 최신순 정렬
    List<Article> findAllByOrderByIdDesc();
}