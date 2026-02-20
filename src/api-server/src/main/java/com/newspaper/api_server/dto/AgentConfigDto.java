package com.newspaper.api_server.dto;

import java.util.List;

public record AgentConfigDto(
        List<AllowedSenderItem> allowedSenders,
        List<ModificationKeywordItem> modificationKeywords
) {
    public record AllowedSenderItem(Long id, String email) {}
    public record ModificationKeywordItem(Long id, String keyword) {}
}
