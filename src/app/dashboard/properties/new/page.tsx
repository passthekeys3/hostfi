import { AddPropertyForm } from "@/components/add-property-form";

export default function NewPropertyPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Property</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">Add a new rental property to track</p>
      </div>
      <AddPropertyForm />
    </div>
  );
}
