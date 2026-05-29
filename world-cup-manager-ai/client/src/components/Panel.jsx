export default function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-lg border border-white/10 bg-white/[0.045] shadow-panel ${className}`}>
      {children}
    </section>
  );
}
