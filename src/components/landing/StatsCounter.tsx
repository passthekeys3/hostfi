const points = [
  { title: "Bank connections use Plaid", detail: "HostFi does not store bank passwords." },
  { title: "Your rows stay yours", detail: "Each account can only read its own data." },
  { title: "Free for 3 properties", detail: "No credit card to start." },
  { title: "PMS sync is built in", detail: "Hospitable, OwnerRez, Hostaway, Guesty, and Lodgify." },
];

export function StatsCounter() {
  return (
    <section className="py-10 px-5 border-y border-gray-100 bg-white">
      <ul className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {points.map(point => (
          <li key={point.title}>
            <p className="text-sm font-semibold text-gray-900">{point.title}</p>
            <p className="text-sm text-gray-600 mt-1">{point.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
