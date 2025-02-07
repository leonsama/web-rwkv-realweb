export default function About() {
  return (
    <div className="flex h-full w-full flex-col items-stretch">
      <div className="h-20"></div>
      <div
        className="flex flex-1 flex-shrink-0 flex-col items-center overflow-auto px-4 pb-24 md:pb-0"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="flex w-full max-w-screen-md flex-col gap-8 px-2 motion-translate-y-in-[20%] motion-opacity-in-[0%] motion-duration-[0.4s]">
          {/* content here */}
        </div>
      </div>
    </div>
  );
}
