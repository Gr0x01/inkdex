import Link from 'next/link';
import { Tag } from 'lucide-react';
import StyleArtistFinder from '@/components/admin/StyleArtistFinder';
import StyleLeaderboard from '@/components/admin/StyleLeaderboard';

export default function StylesPage() {
  return (
    <div className="space-y-8">
      {/* ML Training: Style Labeling */}
      <div className="bg-gradient-to-r from-ink/5 to-transparent p-4 rounded-lg border border-ink/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-bold text-ink flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Style Labeling for ML
            </h2>
            <p className="text-[12px] text-gray-500 font-body mt-0.5">
              Label tattoo images to train the style classifier
            </p>
          </div>
          <Link
            href="/admin/styles/label"
            className="px-4 py-2 bg-ink text-paper text-xs font-body rounded hover:bg-ink/90 transition-colors"
          >
            Start Labeling
          </Link>
        </div>
      </div>

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
