package com.newspaper.api_server.config;

import com.newspaper.api_server.domain.ModificationKeyword;
import com.newspaper.api_server.repository.ModificationKeywordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 앱 기동 시 수정요청 키워드 기본값이 없으면 [수정배포], [정정요청], [보도자료 정정요청]을 등록한다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AgentConfigSeeder implements ApplicationRunner {

    private static final List<String> DEFAULT_MODIFICATION_KEYWORDS = List.of(
            "[수정배포]",
            "[정정요청]",
            "[보도자료 정정요청]"
    );

    private final ModificationKeywordRepository modificationKeywordRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (modificationKeywordRepository.count() > 0) {
            return;
        }
        DEFAULT_MODIFICATION_KEYWORDS.forEach(kw -> {
            modificationKeywordRepository.save(new ModificationKeyword(kw));
            log.info("AgentConfig: 기본 수정요청 키워드 등록 - {}", kw);
        });
    }
}
