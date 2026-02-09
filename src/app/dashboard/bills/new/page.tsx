import { redirect } from "next/navigation";

export default function NewBillPage() {
  redirect("/dashboard/expenses/new?category=utility");
}
