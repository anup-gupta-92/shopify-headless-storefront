import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="w-full bg-black border-b border-zinc-900 sticky top-0 z-50 font-sans">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo / Brand Name */}
        <Link href="/" className="text-xl font-black tracking-tighter text-white hover:opacity-95 transition">
          APEX<span className="text-emerald-400">BUSINESS</span>SUPPLIES
        </Link>

        {/* Primary Navigation Menu */}
        <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <Link href="/shop" className="hover:text-white transition">Shop</Link>
          <Link href="/about" className="hover:text-white transition">About</Link>
          <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
        </nav>

        {/* Action Items: Cart */}
        <div className="flex items-center gap-4">
          <Link 
            href="/cart" 
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <span>Cart</span>
            <span className="bg-emerald-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              0
            </span>
          </Link>
        </div>

      </div>
    </header>
  );
}