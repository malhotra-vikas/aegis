import { redirect } from "next/navigation";

export default function Home() {
  // The product surfaces (marketing, free audit, app) land here later; for now
  // the only thing running is the demo.
  redirect("/demo");
}
