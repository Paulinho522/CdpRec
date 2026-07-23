interface SkeletonProps {
  count?: number;
}

export default function Skeleton({ count = 4 }: SkeletonProps) {
  return (
    <div className="space-y-2" role="status" aria-label="A carregar">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-skeleton-pulse h-16 rounded-xl bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );
}
