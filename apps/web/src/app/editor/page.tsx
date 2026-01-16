"use client";

import nextDynamic from "next/dynamic";

const EditorClient = nextDynamic(() => import("./editor-client"), {
  ssr: false,
});

export default function EditorPage() {
  return <EditorClient />;
}
