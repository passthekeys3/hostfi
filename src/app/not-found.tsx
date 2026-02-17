import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="text-center">
        <div className="inline-flex items-center gap-2.5 mb-8">
          <img src="/logo.svg" alt="HostFi" className="w-10 h-10" />
          <span className="text-2xl font-bold tracking-tight text-gray-900">HostFi</span>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-500 mb-8 text-sm">This page doesn't exist.</p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
