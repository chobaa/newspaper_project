package com.newspaper.api_server.repository;

import com.newspaper.api_server.domain.BrandSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandSettingsRepository extends JpaRepository<BrandSettings, String> {
}
