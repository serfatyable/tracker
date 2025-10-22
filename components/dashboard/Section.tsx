export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded border bg-white dark:bg-neutral-900 p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-foreground dark:text-white">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
