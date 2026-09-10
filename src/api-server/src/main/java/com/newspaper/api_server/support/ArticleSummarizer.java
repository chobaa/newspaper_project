package com.newspaper.api_server.support;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 목록/위젯에 필요한 최소 정보(요약문, 썸네일)를 기사 본문 HTML에서 뽑아내는 유틸.
 *
 * <p>기존에는 프론트가 본문 HTML 전체를 내려받아 브라우저에서 정규식으로 추출했기 때문에
 * 목록 한 번 여는 데 수 MB를 전송해야 했습니다. 같은 로직을 서버로 옮겨서
 * 목록 응답에는 요약문과 썸네일 URL만 담습니다.</p>
 */
public final class ArticleSummarizer {

    /** 목록 카드에 노출되는 요약문 길이 (프론트 line-clamp 기준으로 충분한 길이) */
    public static final int SUMMARY_LENGTH = 300;

    private static final Pattern IMG_SRC =
            Pattern.compile("<img[^>]+src=\"([^\">]+)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");
    private static final Pattern NUMERIC_ENTITY =
            Pattern.compile("&#(x[0-9a-fA-F]+|[0-9]+);");

    /** 본문 어디에 있든 유튜브 영상 ID를 찾아내기 위한 패턴들 (프론트 로직과 동일한 우선순위) */
    private static final Pattern[] YOUTUBE_PATTERNS = {
            Pattern.compile("youtube[.]com/embed/([a-zA-Z0-9_-]{6,})", Pattern.CASE_INSENSITIVE),
            Pattern.compile("youtube[.]com/watch[^<>\"' ]{0,200}?[?&]v=([a-zA-Z0-9_-]{6,})", Pattern.CASE_INSENSITIVE),
            Pattern.compile("youtu[.]be/([a-zA-Z0-9_-]{6,})", Pattern.CASE_INSENSITIVE),
            Pattern.compile("youtube[.]com/shorts/([a-zA-Z0-9_-]{6,})", Pattern.CASE_INSENSITIVE),
    };

    private ArticleSummarizer() {
    }

    /** 썸네일 추출 결과. video=true 이면 유튜브 영상에서 뽑아낸 썸네일입니다. */
    public record Thumbnail(String url, boolean video) {
        public static final Thumbnail NONE = new Thumbnail(null, false);
    }

    /** 에디터가 남기는 &amp;nbsp; 계열을 공백으로 정리 (프론트 normalizeContentHtml 과 동일) */
    public static String normalize(String contentHtml) {
        if (contentHtml == null) return "";
        return contentHtml
                .replace("&amp;nbsp;", " ")
                .replace("&nbsp;", " ");
    }

    /** 태그를 제거한 본문 앞부분을 요약문으로 반환합니다. */
    public static String summarize(String contentHtml) {
        String plain = HTML_TAG.matcher(normalize(contentHtml)).replaceAll("");
        if (plain.isEmpty()) return "";
        if (plain.length() <= SUMMARY_LENGTH) return plain;
        return plain.substring(0, SUMMARY_LENGTH) + "...";
    }

    /**
     * 목록 카드용 썸네일. 본문의 첫 이미지를 우선 사용하고,
     * 이미지가 없으면 유튜브 영상 썸네일로 대체합니다.
     */
    public static Thumbnail thumbnail(String contentHtml) {
        String html = normalize(contentHtml);
        if (html.isEmpty()) return Thumbnail.NONE;

        Matcher img = IMG_SRC.matcher(html);
        if (img.find()) {
            String src = decodeEntities(img.group(1));
            if (src != null && !src.isBlank()) {
                return new Thumbnail(src, false);
            }
        }

        String youtubeId = findYouTubeId(decodeEntities(html));
        if (youtubeId != null) {
            return new Thumbnail("https://img.youtube.com/vi/" + youtubeId + "/hqdefault.jpg", true);
        }
        return Thumbnail.NONE;
    }

    private static String findYouTubeId(String html) {
        for (Pattern pattern : YOUTUBE_PATTERNS) {
            Matcher m = pattern.matcher(html);
            if (m.find()) return m.group(1);
        }
        return null;
    }

    /** DB에 저장된 &amp;amp; / &amp;#39; 같은 엔티티를 실제 문자로 복원 (이미지 URL이 깨지는 것을 방지) */
    static String decodeEntities(String value) {
        if (value == null || value.isEmpty()) return value;

        Matcher m = NUMERIC_ENTITY.matcher(value);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String token = m.group(1);
            int codePoint;
            try {
                codePoint = token.startsWith("x") || token.startsWith("X")
                        ? Integer.parseInt(token.substring(1), 16)
                        : Integer.parseInt(token);
            } catch (NumberFormatException e) {
                m.appendReplacement(sb, Matcher.quoteReplacement(m.group()));
                continue;
            }
            m.appendReplacement(sb, Matcher.quoteReplacement(new String(Character.toChars(codePoint))));
        }
        m.appendTail(sb);

        return sb.toString()
                .replace("&quot;", "\"")
                .replace("&apos;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&"); // &amp; 는 다른 엔티티를 모두 처리한 뒤 마지막에
    }
}
