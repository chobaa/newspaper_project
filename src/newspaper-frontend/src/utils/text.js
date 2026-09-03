/**
 * API/DB에서 오는 &#39; &quot; 등 HTML 엔티티를 실제 문자로 복원
 */
export function decodeHtmlEntities(str) {
  if (str == null || typeof str !== "string") return str ?? "";
  const textarea = document.createElement("textarea");
  textarea.innerHTML = str;
  return textarea.value;
}
