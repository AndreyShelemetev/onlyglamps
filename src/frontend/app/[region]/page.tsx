import { Metadata } from "next";
import { ListingPage } from "@/components/ListingPage";
import { fetchObjects } from "@/lib/api";
import { LISTING_PAGE_SIZE, listingMetadata, resolveListing } from "@/lib/listing";
import { pickFilterParams } from "@/lib/seo";

interface Props {
  params: { region: string };
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const ctx = await resolveListing(params.region, [], 1);
  if (!ctx) return {};

  const { total } = await fetchObjects({
    ...pickFilterParams(searchParams),
    region: ctx.region.slug,
    page: "1",
    pageSize: String(LISTING_PAGE_SIZE),
  });

  return listingMetadata(ctx, searchParams, total === 0);
}

export default function RegionPage({ params, searchParams }: Props) {
  return (
    <ListingPage
      regionSlug={params.region}
      segments={[]}
      page={1}
      searchParams={searchParams}
    />
  );
}
