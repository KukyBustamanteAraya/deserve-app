export default function StyleTestPage() {
  return (
    <div className="p-8 tw-probe-border">
      <h1 className="text-3xl font-bold underline">Tailwind OK?</h1>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="h-10 bg-blue-500" />
        <div className="h-10 bg-green-500" />
        <div className="h-10 bg-red-500" />
      </div>
    </div>
  );
}
