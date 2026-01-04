import StyleLeaderboard from '@/components/admin/StyleLeaderboard';

export default function StylesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-base font-bold text-ink">
          Style Leaderboard
        </h1>
        <p className="text-[12px] text-gray-500 font-body">
          Top artists by style for marketing curation
        </p>
      </div>

      <StyleLeaderboard />
    </div>
  );
}
