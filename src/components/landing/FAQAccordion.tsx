"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

function FAQItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  const answerId = `faq-answer-${id}`;
  
  return (
    <div className="border-b border-gray-100" role="listitem">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left cursor-pointer group"
        aria-expanded={open}
        aria-controls={answerId}
        role="button"
      >
        <span className="text-[15px] font-medium text-gray-900 group-hover:text-teal-600 transition-colors pr-8">{q}</span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} 
          aria-hidden="true"
        />
      </button>
      <div 
        id={answerId}
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48 pb-5" : "max-h-0"}`}
        role="region"
        aria-labelledby={`faq-question-${id}`}
      >
        <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

const faqData = [
  { q: "What types of properties does HostFi support?", a: "Any rental property — single-family homes, multi-family, condos, short-term rentals (Airbnb, VRBO), and commercial. If it has expenses, HostFi can track them." },
  { q: "How is HostFi different from a spreadsheet or QuickBooks?", a: "Spreadsheets don't understand rental properties — you end up building complex formulas just to track per-property costs. QuickBooks is powerful but designed for general businesses, not rental operators. HostFi is purpose-built: it auto-categorizes expenses by property, maps directly to IRS Schedule E line items, and catches anomalies like utility spikes automatically. No accounting degree required." },
  { q: "How does the AI bill parsing work?", a: "Forward bills to your unique HostFi email address. Our AI reads the document, extracts amount, due date, vendor, and category, then matches it to the correct property based on your account details." },
  { q: "What's the difference between Owner and Arbitrage mappings?", a: "Owners and arbitrage operators have different tax situations. For example, an owner deducts mortgage interest on Line 12, while an arbitrage operator deducts rent on Line 19 (Other). HostFi handles both automatically." },
  { q: "Is my financial data secure?", a: "We use bank-level encryption and never store banking credentials. Your data is encrypted at rest and in transit. Bill payments are processed through licensed third-party providers — we never touch your funds." },
  { q: "Can I import existing expense data?", a: "Yes. Import from CSV or Excel — our import wizard auto-maps your columns and flags duplicates. Xero sync coming soon on Business plan." },
  { q: "Do you integrate with property management software?", a: "Yes. HostFi integrates with Hospitable, OwnerRez, Hostaway, Guesty, and Lodgify to sync properties and bookings automatically. You can also connect Airbnb and VRBO directly without a PMS. We also connect with Plaid for bank sync, plus Slack, Google Sheets, Google Drive, Zapier, and Make. QuickBooks and Xero exports available too." },
  { q: "What's the cancellation policy?", a: "Cancel anytime from your settings — no contracts, no fees. Your data stays accessible for 30 days after cancellation." },
];

export function FAQAccordion() {
  return (
    <div role="list" aria-label="Frequently asked questions">
      {faqData.map((item, i) => (
        <FAQItem key={i} q={item.q} a={item.a} id={`${i}`} />
      ))}
    </div>
  );
}
