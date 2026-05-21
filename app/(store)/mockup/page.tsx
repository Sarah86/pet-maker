import MockupViewer from "@/components/MockupViewer";

export default function MockupPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Pré-visualização</h1>
        <p className="text-muted-foreground">
          Veja como sua arte ficará no produto antes de finalizar.
        </p>
      </div>
      <MockupViewer />
    </div>
  );
}
