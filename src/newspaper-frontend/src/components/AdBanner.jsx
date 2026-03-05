export default function AdBanner({
  height = "h-64",
  text = "광고 배너",
  imageUrl,
  linkUrl,
  banners,
}) {
  // 새 구조: banners 배열이 있으면 그걸 우선 사용 (개별 show 플래그 지원)
  const normalizedBanners = Array.isArray(banners)
    ? banners
        .filter((b) => b && (b.imageUrl || b.text) && (b.show !== false))
    : [];

  const hasMulti = normalizedBanners.length > 0;
  const hasSingleImage = Boolean(imageUrl);

  // 여러 개 배너가 있는 경우: 각각을 클릭 가능한 영역으로 렌더링
  if (hasMulti) {
    return (
      <div
        className="w-full border border-gray-300 rounded-xl overflow-hidden mb-6 bg-white"
      >
        <div className="w-full flex flex-col divide-y divide-gray-200">
          {normalizedBanners.map((banner, idx) => {
            const bannerHasImage = Boolean(banner.imageUrl);
            const content = (
              <div className="w-full h-32 flex items-center justify-center bg-white">
                {bannerHasImage ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.text || text}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs py-4">
                    <span className="font-bold text-gray-500 mb-1">AD</span>
                    <span>{banner.text || text}</span>
                  </div>
                )}
              </div>
            );

            // 링크가 있으면 새 창으로 이동
            return banner.linkUrl ? (
              <a
                key={idx}
                href={banner.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 block hover:bg-gray-100 transition-colors"
              >
                {content}
              </a>
            ) : (
              <div key={idx} className="flex-1">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 기존 구조: 단일 이미지/텍스트 + 선택적 링크
  const wrapperClasses = `w-full ${height} border border-gray-300 rounded-xl overflow-hidden mb-6 ${
    hasSingleImage ? "" : "bg-gray-200 flex flex-col items-center justify-center text-gray-400 text-sm"
  }`;

  const content = hasSingleImage ? (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <img
        src={imageUrl}
        alt={text}
        className="max-h-full max-w-full w-full object-contain"
      />
    </div>
  ) : (
    <>
      <span className="font-bold text-gray-500">AD</span>
      <span>{text}</span>
    </>
  );

  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={wrapperClasses}
      >
        {content}
      </a>
    );
  }

  return <div className={wrapperClasses}>{content}</div>;
}