import Link from "next/link";
import { Building2 } from "lucide-react";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-12">Last Updated: February 9, 2026</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using HostFi (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              HostFi is an AI-powered expense management platform for rental property operators. The Service helps you track, categorize, and analyze property expenses, generate tax reports, and manage your rental property finances. HostFi is a financial management tool — we are not a bank, lender, or licensed financial advisor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Accounts</h2>
            <p className="text-gray-600 leading-relaxed">
              You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating an account. One person or legal entity may not maintain more than one free account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Pricing and Billing</h2>
            <p className="text-gray-600 leading-relaxed">
              Free accounts are available with limited features. Paid plans are billed monthly or annually as selected. You can cancel at any time from your Settings page — no contracts and no cancellation fees. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with 30 days&apos; notice to existing customers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Bill Pay and Financial Transactions</h2>
            <p className="text-gray-600 leading-relaxed">
              HostFi facilitates bill payments through licensed third-party payment providers. HostFi never holds, transmits, or has access to your funds. All payment transactions are subject to the terms and conditions of the respective payment provider. HostFi is not responsible for failed or delayed payments processed by third-party providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. AI Features Disclaimer</h2>
            <p className="text-gray-600 leading-relaxed">
              HostFi uses artificial intelligence to parse documents, categorize expenses, detect anomalies, and suggest tax mappings. While we strive for accuracy, AI-generated outputs may contain errors. You are responsible for reviewing and verifying all AI-generated categorizations, tax mappings, and financial summaries before relying on them for tax filing or financial decisions. HostFi is not a substitute for professional tax or accounting advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Data</h2>
            <p className="text-gray-600 leading-relaxed">
              You retain ownership of all data you upload to HostFi. We do not claim ownership of your financial data, receipts, or property information. You grant us a limited license to process your data solely to provide the Service. Upon account deletion, your data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed">
              You may not use HostFi for any illegal purpose, to process data you do not have the right to use, or to attempt to gain unauthorized access to other users&apos; data. We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              HostFi is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to incorrect tax categorizations, missed payments, or data loss. Our total liability is limited to the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these terms from time to time. We will notify you of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these terms, contact us at legal@hostfi.ai.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
