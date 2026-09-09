export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full bg-black border-t border-zinc-900 mt-20 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
        <p>© {currentYear} BoxCraft Supplies Inc. All rights reserved.</p>
        <p className="text-xs text-zinc-600 font-mono">Premium Packaging Solutions</p>
      </div>
    </footer>
  );
}