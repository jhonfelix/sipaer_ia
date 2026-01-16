import { redirect } from "next/navigation";

export default function Home() {
  // Redirecionar para a página de edição do relatório de exemplo
  redirect("/reports/rpt-001/edit");
}
