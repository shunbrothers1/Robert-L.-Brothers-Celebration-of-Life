import { redirect } from "next/navigation";

// The site root goes to the event list, which itself goes straight to the
// event when only one is published.
export default function Home() {
  redirect("/celebration");
}
