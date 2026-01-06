export default function VideoLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-gray-500 dark:text-gray-400">Loading video...</p>
      </div>
    </div>
  );
}
