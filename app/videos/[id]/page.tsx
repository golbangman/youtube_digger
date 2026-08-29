import { redirect } from "next/navigation";

export default async function VideoPage(props: PageProps<"/videos/[id]">) {
  const { id } = await props.params;
  redirect(`/videos/${id}/translate`);
}
