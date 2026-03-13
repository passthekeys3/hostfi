"use client";

import Link from "next/link";
import { Shield, Lock, Database, Eye, Server, Users, AlertTriangle, RefreshCw } from "lucide-react";

// Note: metadata exported from layout or parent since this is "use client"
// SEO handled via layout.tsx metadata API

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="HostFi" className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">HostFi</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Policy</h1>
              <p className="text-gray-500 text-sm">Last updated: February 2026</p>
            </div>
          </div>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            At HostFi, protecting your financial data is our top priority. This document outlines
            our security practices, infrastructure, and commitment to keeping your information safe.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">

          <Section
            icon={<Server className="w-5 h-5 text-teal-600" />}
            title="Infrastructure Security"
          >
            <ul className="space-y-3">
              <li>
                <strong>Hosting:</strong> HostFi is hosted on <Ext href="https://vercel.com/security">Vercel</Ext>,
                which maintains SOC 2 Type II compliance, provides enterprise-grade DDoS protection,
                Web Application Firewall (WAF), and automatic SSL/TLS certificate management.
              </li>
              <li>
                <strong>Database:</strong> All application data is stored in <Ext href="https://supabase.com/security">Supabase</Ext> (built on PostgreSQL),
                which maintains SOC 2 Type II compliance with data centers in the United States.
              </li>
              <li>
                <strong>CDN & Edge:</strong> All traffic is served through Vercel&apos;s global edge network
                with automatic HTTPS enforcement. HTTP Strict Transport Security (HSTS) is enabled.
              </li>
            </ul>
          </Section>

          <Section
            icon={<Lock className="w-5 h-5 text-teal-600" />}
            title="Encryption"
          >
            <ul className="space-y-3">
              <li>
                <strong>In Transit:</strong> All data transmitted between your browser and HostFi is encrypted
                using TLS 1.2 or higher. API calls to third-party services (Plaid, PMS integrations) are
                also encrypted via TLS.
              </li>
              <li>
                <strong>At Rest:</strong> All database data is encrypted at rest using AES-256 encryption,
                managed by our infrastructure provider (Supabase/AWS).
              </li>
              <li>
                <strong>Credentials:</strong> Third-party integration credentials (OAuth tokens, API keys)
                are stored encrypted in the database and are never exposed to the client-side application.
              </li>
            </ul>
          </Section>

          <Section
            icon={<Users className="w-5 h-5 text-teal-600" />}
            title="Authentication & Access Control"
          >
            <ul className="space-y-3">
              <li>
                <strong>User Authentication:</strong> Managed through Supabase Auth with bcrypt password
                hashing, secure session tokens, and support for Google OAuth single sign-on.
              </li>
              <li>
                <strong>Row Level Security (RLS):</strong> PostgreSQL Row Level Security policies are enforced
                at the database level, ensuring users can only access their own data. Every query is scoped
                to the authenticated user — cross-user data access is architecturally impossible.
              </li>
              <li>
                <strong>API Security:</strong> All API endpoints enforce server-side authentication via
                secure session validation. Unauthenticated requests are rejected before any data access occurs.
              </li>
              <li>
                <strong>OAuth Integrations:</strong> Third-party connections (Google, Slack, OwnerRez)
                use industry-standard OAuth 2.0 flows. HostFi never sees or stores third-party passwords.
              </li>
            </ul>
          </Section>

          <Section
            icon={<Database className="w-5 h-5 text-teal-600" />}
            title="Financial Data Handling"
          >
            <ul className="space-y-3">
              <li>
                <strong>Plaid Integration:</strong> Bank account connectivity is powered by{" "}
                <Ext href="https://plaid.com/safety/">Plaid</Ext>, a SOC 2 Type II certified financial
                data platform. HostFi never has access to your bank login credentials — Plaid handles
                all bank authentication directly.
              </li>
              <li>
                <strong>Minimal Data Collection:</strong> We only store transaction data necessary for
                expense matching and tax categorization. We do not store full bank account numbers,
                routing numbers, or bank login credentials.
              </li>
              <li>
                <strong>No Data Selling:</strong> Your financial data is never sold, shared with, or
                disclosed to third parties for marketing or advertising purposes. Period.
              </li>
              <li>
                <strong>Data Retention:</strong> You can disconnect integrations and delete your data
                at any time from your dashboard settings.
              </li>
            </ul>
          </Section>

          <Section
            icon={<Eye className="w-5 h-5 text-teal-600" />}
            title="Monitoring & Incident Response"
          >
            <ul className="space-y-3">
              <li>
                <strong>Logging:</strong> Application errors, authentication events, and security-relevant
                actions are logged and monitored.
              </li>
              <li>
                <strong>Infrastructure Monitoring:</strong> Uptime, performance, and security events are
                monitored through Vercel and Supabase&apos;s built-in observability tools.
              </li>
              <li>
                <strong>Incident Response:</strong> In the event of a security incident, affected users
                will be notified promptly via email with details of the incident and recommended actions.
              </li>
            </ul>
          </Section>

          <Section
            icon={<AlertTriangle className="w-5 h-5 text-teal-600" />}
            title="Vulnerability Disclosure"
          >
            <p>
              If you discover a security vulnerability in HostFi, please report it responsibly by emailing{" "}
              <a href="mailto:security@hostfi.ai" className="text-teal-600 hover:underline font-medium">
                security@hostfi.ai
              </a>. We take all reports seriously and will respond within 48 hours.
            </p>
          </Section>

          <Section
            icon={<RefreshCw className="w-5 h-5 text-teal-600" />}
            title="Compliance & Continuous Improvement"
          >
            <ul className="space-y-3">
              <li>
                <strong>Vendor Compliance:</strong> Our core infrastructure providers (Vercel, Supabase, Plaid, Stripe)
                all maintain SOC 2 Type II certifications and undergo regular third-party security audits.
              </li>
              <li>
                <strong>Payment Processing:</strong> All payment processing is handled by{" "}
                <Ext href="https://stripe.com/docs/security">Stripe</Ext> (PCI DSS Level 1 certified).
                HostFi never stores credit card numbers or payment credentials.
              </li>
              <li>
                <strong>Policy Reviews:</strong> Security policies and practices are reviewed and updated
                on an ongoing basis as the company and threat landscape evolve.
              </li>
            </ul>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Questions about our security practices? Contact us at{" "}
            <a href="mailto:security@hostfi.ai" className="text-teal-600 hover:underline">security@hostfi.ai</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="text-gray-600 leading-relaxed pl-0 sm:pl-[30px]">
        {children}
      </div>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
      {children}
    </a>
  );
}
