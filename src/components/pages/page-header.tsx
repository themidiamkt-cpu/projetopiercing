export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold tracking-[-0.01em] text-[#111111]">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">{description}</p>
    </div>
  );
}
