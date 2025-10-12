export default function Health() {
  return <div className="p-6 text-lg">OK • {new Date().toISOString()}</div>;
}
