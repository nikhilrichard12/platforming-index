export default function TopBar() {
  return (
    <header className="sticky top-0 z-50 h-11 bg-chrome">
      <div className="flex h-full items-center px-12">
        <span className="text-[15px] leading-none tracking-tight text-text">
          <span className="font-bold">Platforming</span>{" "}
          <span className="font-light">Index</span>
        </span>
      </div>
    </header>
  );
}
