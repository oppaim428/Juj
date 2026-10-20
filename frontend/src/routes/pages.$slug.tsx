import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchPage } from "@/lib/content.functions";
import { RichText } from "@/components/site/RichText";

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params }) => {
    const page = await fetchPage({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? "Page"} — JUJ` }] }),
  component: Page,
});

function Page() {
  const p = Route.useLoaderData();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10" data-testid={`page-${p.slug}`}>
      <h1 className="text-4xl font-bold sm:text-5xl" data-testid="page-title">{p.title}</h1>
      <RichText text={p.body} />
    </article>
  );
}
