"use client";

import { useParams } from "next/navigation";
import { ProjectWorkspace } from "@/components/project";

export default function ChatProjectPage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectWorkspace projectId={id} scope="general" />;
}
