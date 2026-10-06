import { businessConfig } from "@/lib/config";
import ChatWidget from "./ChatWidget";

export const dynamic = "force-dynamic";

export default function WidgetPage() {
  return <ChatWidget businessName={businessConfig().name} />;
}
