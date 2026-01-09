export default function AdBanner({ height = "h-64", text = "광고 배너" }) {
  return (
    <div className={`w-full ${height} bg-gray-200 border border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 text-sm mb-6`}>
      <span className="font-bold text-gray-500">AD</span>
      <span>{text}</span>
    </div>
  );
}