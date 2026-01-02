export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Login</h1>
          <p className="text-zinc-400">Connect your Instagram Business account</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-8">
          <a
            href="/api/auth/instagram?redirect=/dashboard"
            className="block w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Connect Instagram Business Account
          </a>

          <p className="mt-4 text-sm text-zinc-500 text-center">
            Requires Instagram Business or Creator account connected to a Facebook Page
          </p>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
            ← Back to homepage
          </a>
        </div>
      </div>
    </div>
  )
}
