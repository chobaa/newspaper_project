package com.newspaper.api_server.service;

import com.newspaper.api_server.domain.AllowedSender;
import com.newspaper.api_server.domain.ModificationKeyword;
import com.newspaper.api_server.repository.AllowedSenderRepository;
import com.newspaper.api_server.repository.ModificationKeywordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgentConfigService {

    private final AllowedSenderRepository allowedSenderRepository;
    private final ModificationKeywordRepository modificationKeywordRepository;

    // ========== Allowed Senders (화이트리스트) ==========

    @Transactional(readOnly = true)
    public List<String> getAllowedSenders() {
        return allowedSenderRepository.findAllByOrderByIdAsc()
                .stream()
                .map(AllowedSender::getEmail)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.newspaper.api_server.dto.AgentConfigDto.AllowedSenderItem> getAllowedSenderItems() {
        return allowedSenderRepository.findAllByOrderByIdAsc()
                .stream()
                .map(a -> new com.newspaper.api_server.dto.AgentConfigDto.AllowedSenderItem(a.getId(), a.getEmail()))
                .collect(Collectors.toList());
    }

    @Transactional
    public Long addAllowedSender(String email) {
        AllowedSender entity = new AllowedSender(email.trim().toLowerCase());
        return allowedSenderRepository.save(entity).getId();
    }

    @Transactional
    public void removeAllowedSender(Long id) {
        allowedSenderRepository.deleteById(id);
    }

    // ========== Modification Keywords (수정요청 인식 키워드) ==========

    @Transactional(readOnly = true)
    public List<String> getModificationKeywords() {
        return modificationKeywordRepository.findAllByOrderByIdAsc()
                .stream()
                .map(ModificationKeyword::getKeyword)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.newspaper.api_server.dto.AgentConfigDto.ModificationKeywordItem> getModificationKeywordItems() {
        return modificationKeywordRepository.findAllByOrderByIdAsc()
                .stream()
                .map(k -> new com.newspaper.api_server.dto.AgentConfigDto.ModificationKeywordItem(k.getId(), k.getKeyword()))
                .collect(Collectors.toList());
    }

    @Transactional
    public Long addModificationKeyword(String keyword) {
        ModificationKeyword entity = new ModificationKeyword(keyword.trim());
        return modificationKeywordRepository.save(entity).getId();
    }

    @Transactional
    public void removeModificationKeyword(Long id) {
        modificationKeywordRepository.deleteById(id);
    }

    /**
     * 메일 처리 시 사용할 리스트 (캐시 없이 매번 DB 조회)
     */
    @Transactional(readOnly = true)
    public List<String> getAllowedSenderEmails() {
        return getAllowedSenders();
    }

    @Transactional(readOnly = true)
    public List<String> getModificationKeywordsList() {
        return getModificationKeywords();
    }
}
