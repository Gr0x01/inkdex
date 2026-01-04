import StyleArtistFinder from '@/components/admin/StyleArtistFinder';
import StyleLeaderboard from '@/components/admin/StyleLeaderboard';

export default function StylesPage() {
  return (
    <div className="space-y-8">
      {/* Primary: Artist Finder by Style (for marketing outreach) */}
      <div className="space-y-4">
        <div>
          <h1 className="font-heading text-base font-bold text-ink">
            Find Artists by Style
          </h1>
          <p className="text-[12px] text-gray-500 font-body">
            Search unclaimed artists by style percentage for marketing outreach
          </p>
        </div>
        <StyleArtistFinder />
      </div>

      {/* Secondary: Style Leaderboard */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div>
          <h2 className="font-heading text-sm font-bold text-ink">
            Style Leaderboard
          </h2>
          <p className="text-[12px] text-gray-500 font-body">
            Top artists by style similarity (based on seed images)
          </p>
        </div>
        <StyleLeaderboard />
      </div>
    </div>
  );
}
