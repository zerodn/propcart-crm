import { Skeleton } from '@/components/common/skeleton';

export default function ProtectedLoading() {
  return (
    <div className="space-y-[0.8rem] animate-in fade-in duration-200">
      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
          >
            <Skeleton className="h-5 w-2/3 mb-3 dark:bg-gray-700" />
            <Skeleton className="h-4 w-full mb-2 dark:bg-gray-700" />
            <Skeleton className="h-4 w-4/5 mb-4 dark:bg-gray-700" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 dark:bg-gray-700" />
              <Skeleton className="h-8 w-20 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
