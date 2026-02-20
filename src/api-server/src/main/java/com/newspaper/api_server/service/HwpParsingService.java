package com.newspaper.api_server.service;

import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.reader.HWPReader;
import org.springframework.stereotype.Service;

import java.io.InputStream;

/**
 * HWP 파일에서 본문 텍스트를 추출하는 서비스.
 * - 실제 구현은 사용하는 hwplib 버전에 맞춰 보완 가능하며,
 *   현재는 간단히 기본 텍스트를 추출하는 형태로 구성했다.
 */
@Service
public class HwpParsingService {

    public String extractText(InputStream inputStream) {
        try {
            HWPFile hwpFile = HWPReader.fromInputStream(inputStream);
            return hwpFile.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HWP 파일 파싱에 실패했습니다.", e);
        }
    }
}

