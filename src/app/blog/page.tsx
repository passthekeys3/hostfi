import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | HostFi",
  description: "Guides and tips for rental property operators. Expense tracking, Schedule E tax prep, and STR management best practices.",
  openGraph: {
    title: "HostFi Blog",
    description: "Guides and tips for rental property operators.",
    url: "https://hostfi.ai/blog",
  },
};

const posts = [
  {
    slug: "schedule-e-guide",
    title: "Schedule E for Rental Properties: The Complete 2026 Guide",
    description: "Line-by-line breakdown of Schedule E for rental property owners and STR operators. Common deductions, audit red flags, and how to make tax time painless.",
    readTime: "12 min read",
    date: "February 2026",
  },
  {
    slug: "str-expense-tracking",
    title: "How to Track STR Expenses for Schedule E",
    description: "A practical guide to tracking short-term rental expenses. Which expenses are deductible, how to categorize them, and common mistakes that cost operators money.",
    readTime: "8 min read",
    date: "February 2026",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-5 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">HostFi</span>
          </Link>
          <Link href="/login" className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            Get Started Free
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">Blog</h1>
        <p className="text-gray-500 text-sm mb-12">Guides and tips for rental property operators.</p>

        <div className="space-y-8">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <article className="p-6 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>{post.date}</span>
                  <span>&middot;</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors mb-2">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{post.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600">
                  Read More <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 px-5 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <p>&copy; 2026 HostFi. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
