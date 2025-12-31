package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.Article;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArticleRepository extends JpaRepository<Article, Long>{
}