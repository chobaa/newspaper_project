package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.Image;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageRepository extends JpaRepository<Image, Long> {
}

