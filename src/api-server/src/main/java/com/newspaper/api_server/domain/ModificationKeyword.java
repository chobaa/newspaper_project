package com.newspaper.api_server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class ModificationKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String keyword; // 제목에 포함되면 수정요청으로 인식 (예: [수정배포], [정정요청])

    public ModificationKeyword(String keyword) {
        this.keyword = keyword;
    }
}
