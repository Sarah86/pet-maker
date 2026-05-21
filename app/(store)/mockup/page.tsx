import MockupViewer from "@/components/MockupViewer";
import { getDictionary } from "@/lib/i18n";

export default function MockupPage() {
  const { pages: { mockup } } = getDictionary();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{mockup.title}</h1>
        <p className="text-muted-foreground">{mockup.subtitle}</p>
      </div>
      <MockupViewer />
    </div>
  );
}
