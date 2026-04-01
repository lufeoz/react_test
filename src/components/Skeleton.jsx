import './Skeleton.css';

export function SkeletonBlock({ width, height = 16, radius = 8, style }) {
  return (
    <div
      className="skeleton-block"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-wrap">
      {/* Header */}
      <SkeletonBlock width="60%" height={28} radius={10} />
      <SkeletonBlock width="30%" height={14} style={{ marginTop: 6 }} />

      {/* Stats card */}
      <div className="skeleton-stats" style={{ marginTop: 28 }}>
        <SkeletonBlock width={50} height={40} radius={10} />
        <div className="skeleton-chips">
          <SkeletonBlock width={48} height={32} radius={8} />
          <SkeletonBlock width={48} height={32} radius={8} />
          <SkeletonBlock width={48} height={32} radius={8} />
        </div>
      </div>

      {/* Rest type card */}
      <div className="skeleton-card" style={{ marginTop: 16 }}>
        <SkeletonBlock width={48} height={48} radius={10} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="50%" height={16} />
          <SkeletonBlock width="70%" height={12} style={{ marginTop: 6 }} />
        </div>
      </div>

      {/* Quick actions */}
      <SkeletonBlock width="30%" height={12} style={{ marginTop: 22 }} />
      <div className="skeleton-actions" style={{ marginTop: 12 }}>
        <SkeletonBlock width="100%" height={72} radius={14} style={{ flex: 1 }} />
        <SkeletonBlock width="100%" height={72} radius={14} style={{ flex: 1 }} />
        <SkeletonBlock width="100%" height={72} radius={14} style={{ flex: 1 }} />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-feed-card">
          <div className="skeleton-feed-header">
            <SkeletonBlock width={36} height={36} radius={18} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock width="40%" height={14} />
              <SkeletonBlock width="60%" height={11} style={{ marginTop: 5 }} />
            </div>
          </div>
          <SkeletonBlock width="80%" height={14} style={{ marginTop: 12 }} />
          <SkeletonBlock width="100%" height={12} style={{ marginTop: 8 }} />
          <SkeletonBlock width="70%" height={12} style={{ marginTop: 4 }} />
          <div className="skeleton-reactions" style={{ marginTop: 14 }}>
            <SkeletonBlock width={60} height={28} radius={14} />
            <SkeletonBlock width={70} height={28} radius={14} />
            <SkeletonBlock width={80} height={28} radius={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ marginTop: i > 0 ? 10 : 0 }}>
          <SkeletonBlock width={40} height={40} radius={10} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="55%" height={14} />
            <SkeletonBlock width="80%" height={11} style={{ marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
