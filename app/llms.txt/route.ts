import { llmsDiscoveryResponse } from "@/lib/agent-discovery";

export function GET() {
  return llmsDiscoveryResponse();
}
