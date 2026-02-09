import Link from "next/link";
import { Building2 } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">HostFi</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Last Updated: February 9, 2026</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              When you create an account, we collect your email address and name. When you use HostFi, we collect data you provide including property details, expense information, revenue data, and uploaded receipts. We also collect usage data such as pages visited and features used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use your information to provide and improve HostFi&apos;s services, including AI-powered expense categorization, anomaly detection, and tax preparation features. We process your financial documents using AI models to extract and categorize expense data. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Data Storage and Security</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is stored securely using Supabase (built on PostgreSQL) with encryption at rest and in transit. We implement row-level security to ensure you can only access your own data. All API endpoints require authentication. We never store banking credentials — bill payments are processed through licensed third-party providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              We use the following third-party services to operate HostFi:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1 mt-2">
              <li>Supabase — Database and authentication</li>
              <li>Stripe — Payment processing for subscriptions</li>
              <li>Anthropic — AI-powered document parsing and analysis</li>
              <li>Vercel — Application hosting</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-2">
              Each of these providers has their own privacy policy governing how they handle data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You can access, update, or delete your account data at any time from your Settings page. If you cancel your account, your data remains accessible for 30 days, after which it is permanently deleted. You can request a full export of your data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              We use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy-related questions, contact us at privacy@hostfi.ai.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
