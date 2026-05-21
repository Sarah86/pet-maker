import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-base tracking-tight">
            Pet Maker
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Catálogo
            </Link>
            <Link href="/upload" className="hover:text-foreground transition-colors">
              Criar produto
            </Link>
            <Link href="/orders" className="hover:text-foreground transition-colors">
              Meus pedidos
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <Separator className="mb-6" />
        <p>Produtos produzidos e enviados pelo Printful · Pagamentos via Nuvemshop</p>
      </footer>
    </div>
  );
}
