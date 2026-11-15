import PanelClient from "@/components/panel/PanelClient";
import { loadInterfaces, loadVoltaraData } from "@/lib/voltaraData.server";

export const dynamic = "force-dynamic";

export default function PanelPage() {
  return (
    <PanelClient data={loadVoltaraData()} interfaces={loadInterfaces()} />
  );
}
