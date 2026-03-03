export default function AdBanner({ height = "h-64", text = "광고 배너", imageUrl }) {
  const hasImage = Boolean(imageUrl);

  return (
    <div
      className={`w-full ${height} border border-gray-300 rounded-xl overflow-hidden mb-6 ${
        hasImage ? "" : "bg-gray-200 flex flex-col items-center justify-center text-gray-400 text-sm"
      }`}
    >
      {hasImage ? (
        <img
          src={imageUrl}
          alt={text}
          className="w-full h-full object-cover"
        />
      ) : (
        <>
          <span className="font-bold text-gray-500">AD</span>
          <span>{text}</span>
        </>
      )}
    </div>
  );
}