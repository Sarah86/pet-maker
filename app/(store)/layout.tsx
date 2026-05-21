import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { getDictionary } from "@/lib/i18n";
import { DictionaryProvider } from "@/components/DictionaryProvider";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dict = getDictionary();

  return (
    <DictionaryProvider dict={dict}>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold text-base tracking-tight">
              {dict.nav.brand}
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/upload" className="hover:text-foreground transition-colors">
                {dict.nav.upload}
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          <Separator className="mb-6" />
          <p>
            © {new Date().getFullYear()} {dict.nav.footer}{" "}
            <a
              href="https://github.com/Sarah86"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              Sarah86
            </a>
          </p>
        </footer>
      </div>
    </DictionaryProvider>
  );
}
