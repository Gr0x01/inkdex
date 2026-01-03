import ArtistTable from '@/components/admin/ArtistTable';

export default function ArtistsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Featured Artists</h1>
        <p className="text-neutral-500 mt-1">
          Manage which artists appear as featured on the platform
        </p>
      </div>

      <ArtistTable />
    </div>
  );
}
