export default function Navbar() {
  return (
    <nav className="flex gap-4 p-4 border-b border-gray-200 bg-white shadow-sm">
      <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">Home</Link>
      <Link to="/dashboard" className="text-gray-600 hover:text-black">Dashboard</Link>
    </nav>
  );
}