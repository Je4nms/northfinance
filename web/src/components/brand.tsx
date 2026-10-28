// Logo + nome, no topo das telas
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" className="h-9 w-9" />
      <span className="text-xl tracking-tight">
        <b className="font-extrabold">North</b>Finance
      </span>
    </div>
  );
}
