export async function GET() {
  const baseUrl = "https://hostfi.ai";
  
  const posts = [
    {
      title: "Best Airbnb Expense Tracker for Hosts in 2026",
      slug: "airbnb-expense-tracker",
      description: "Compare the best expense tracking tools for Airbnb hosts. From spreadsheets to AI-powered automation, find the right solution for your STR portfolio.",
      pubDate: "Sun, 16 Feb 2026 12:00:00 GMT",
    },
    {
      title: "How to Track STR Expenses for Schedule E",
      slug: "str-expense-tracking",
      description: "A practical guide to tracking short-term rental expenses for IRS Schedule E. Learn which expenses are deductible, how to categorize them, and how to avoid common mistakes at tax time.",
      pubDate: "Sun, 16 Feb 2026 10:00:00 GMT",
    },
    {
      title: "Schedule E for Rental Properties: The Complete 2026 Guide",
      slug: "schedule-e-guide",
      description: "Everything rental property owners and STR operators need to know about IRS Schedule E. Line-by-line breakdown, common deductions, and how to avoid audit triggers.",
      pubDate: "Sun, 16 Feb 2026 08:00:00 GMT",
    },
    {
      title: "Airbnb Tax Deductions: Complete List for Hosts in 2026",
      slug: "airbnb-tax-deductions",
      description: "Every tax deduction Airbnb hosts can claim. Cleaning, supplies, platform fees, depreciation, home office, and more. Organized by Schedule E line item.",
      pubDate: "Thu, 13 Mar 2026 12:00:00 GMT",
    },
    {
      title: "Rental Arbitrage Expense Guide: What to Track and How to Deduct",
      slug: "rental-arbitrage-expenses",
      description: "Complete guide to tracking expenses for Airbnb rental arbitrage. Which costs are deductible, how rent maps to Schedule E, and common mistakes.",
      pubDate: "Thu, 13 Mar 2026 11:00:00 GMT",
    },
    {
      title: "How to Automate Airbnb Bookkeeping in 2026",
      slug: "automate-str-bookkeeping",
      description: "Stop doing STR bookkeeping manually. Step-by-step guide to automating expense tracking, receipt capture, tax categorization, and reporting.",
      pubDate: "Thu, 13 Mar 2026 10:00:00 GMT",
    },
    {
      title: "How to Calculate True Profit Per STR Property",
      slug: "str-profit-per-property",
      description: "Most Airbnb hosts don't know their real profit per property. Here's how to calculate it correctly, including hidden costs most operators miss.",
      pubDate: "Thu, 13 Mar 2026 09:00:00 GMT",
    },
    {
      title: "Best Property Management Software for Airbnb Hosts in 2026",
      slug: "best-pms-for-airbnb",
      description: "Compare Guesty, Hostaway, OwnerRez, Hospitable, and Lodgify. Features, pricing, and who each PMS is best for.",
      pubDate: "Thu, 13 Mar 2026 08:00:00 GMT",
    },
  ];

  const rssItems = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${post.pubDate}</pubDate>
    </item>`
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HostFi Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Tips, guides, and insights for short-term rental operators. Expense tracking, tax preparation, and STR business optimization.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss.trim(), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
