export default function PageHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        {Icon ? (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pitch-400/20 to-pitch-500/5 text-pitch-100 ring-1 ring-pitch-300/25">
            <Icon size={24} />
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
          {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-400">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </div>
  );
}
