package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.ModificationKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModificationKeywordRepository extends JpaRepository<ModificationKeyword, Long> {

    List<ModificationKeyword> findAllByOrderByIdAsc();
}
