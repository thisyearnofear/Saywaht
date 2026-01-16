import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const EditorClient = nextDynamic(() => import("./editor-client"), {
  ssr: false,
});

export default function EditorPage() {
  return <EditorClient />;
}
