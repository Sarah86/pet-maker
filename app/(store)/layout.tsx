import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { nav } = getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-base tracking-tight">
            {nav.brand}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {user ? (
              <>
                <Link href="/upload" className="hover:text-foreground transition-colors">
                  {nav.upload}
                </Link>
                <Link href="/cat-builder" className="hover:text-foreground transition-colors">
                  {nav.catBuilder}
                </Link>
                <Link href="/orders" className="hover:text-foreground transition-colors">
                  {nav.orders}
                </Link>
                <span className="text-xs truncate max-w-[160px] hidden sm:inline">
                  {user.email}
                </span>
                <form action={signOut}>
                  <Button variant="ghost" size="sm" type="submit" className="h-7 px-2 text-xs">
                    {nav.signOut}
                  </Button>
                </form>
              </>
            ) : (
              <Link href="/login" className="hover:text-foreground transition-colors">
                {nav.signIn}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <Separator className="mb-6" />
        <p>
          © {new Date().getFullYear()} {nav.footer}{" "}
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
  );
}
