import ArtistTable from '@/components/admin/ArtistTable';
import ArtistStats from '@/components/admin/ArtistStats';

export default function ArtistsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-base font-bold text-ink">
          Artists
        </h1>
        <p className="text-[12px] text-gray-500 font-body">
          Manage artists and featured status
        </p>
      </div>

      <ArtistStats />

      <ArtistTable />
    </div>
  );
}
