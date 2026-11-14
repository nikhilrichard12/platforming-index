import Badge from "./Badge";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-50 h-11 bg-chrome">
      <div className="flex h-full items-center justify-between px-12">
        <span className="text-[15px] leading-none tracking-tight text-text">
          <span className="font-bold">Platforming</span>{" "}
          <span className="font-light">Index</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[13px] leading-none text-text-2">
            Voltara Power Systems
          </span>
          <Badge>Sample data</Badge>
        </div>
      </div>
    </header>
  );
}
