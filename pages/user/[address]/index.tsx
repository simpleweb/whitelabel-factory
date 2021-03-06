import { ChevronRightIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import { ethers } from "ethers";
import useTranslation from "next-translate/useTranslation";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Button } from "../../../components";
import { fromWei, getMetadataValue, transformURL } from "../../../helpers";
import { useCreatorReleases } from "../../../queries";
import { useWalletStore } from "../../../stores";

export default function UserPage() {
  const { query, push } = useRouter();
  const { address } = useWalletStore();
  const { t } = useTranslation("common");
  const { isLoading, data, error } = useCreatorReleases(query?.address.toLowerCase());
  const isValidAddress = ethers.utils.isAddress(query?.address.toLowerCase());

  useEffect(() => {
    if (address) {
      push(`/user/${address}`);
    }
  }, [address]);

  if (!isValidAddress) {
    return <div>invalid address.</div>;
  }

  if (isLoading) return <div>Loading release....</div>;
  if (error) return <div>There was an error: {error?.message}</div>;
  if (!data.length)
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="gradient-primary-text text-5xl font-semibold leading-loose">
          {t("user.no_releases")}
          <span className="mx-2 text-white">😭</span>
        </h1>
        {address === query?.address && (
          <Button onClick={() => push("/")}>Create your first release</Button>
        )}
      </div>
    );
  return (
    data && (
      <ul className="space-y-5 md:my-5">
        {data.map((release: Release, i: number) => (
          <Link href={`/user/${address}/releases/${release.id}`}>
            <a className="mx-5">
              <ReleaseListItem key={i} release={release} />
            </a>
          </Link>
        ))}
      </ul>
    )
  );

  function ReleaseListItem({ release }: { release: Release }) {
    const image = getMetadataValue(release.metadata, "image");
    const artist = getMetadataValue(release.metadata, "artist");
    const name = getMetadataValue(release.metadata, "name");
    return (
      <li className="gradient-primary mx-5 rounded-2xl">
        <div className="flex items-center px-2 py-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center">
            <div className="flex-shrink-0">
              <img className="h-20 w-20 rounded-full shadow-lg" src={transformURL(image)} alt="" />
            </div>
            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
              <div className="flex flex-col justify-center">
                <p className="truncate text-lg font-medium">{artist}</p>
                <p className="flex flex-col text-sm">
                  <span className="truncate">{name}</span>
                </p>
              </div>
              <div className="hidden md:block">
                <div className="space-y-2">
                  <p className="text-xs">
                    <span className="font-bold">Release date: </span>
                    <span>{dayjs.unix(release.createdAt).format("DD MMMM YYYY")}</span>
                  </p>
                  <p className="text-xs">
                    <span className="font-bold">Sold: </span>
                    {`${release.saleData.totalSold}/${release.saleData.maxSupply} ${release.symbol}`}
                  </p>
                  <p className="text-xs">
                    <span className="font-bold">Sale Price: </span>
                    {`${fromWei(release.saleData.salePrice.toString())} MATIC`}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <ChevronRightIcon className="h-10 w-10" aria-hidden="true" />
          </div>
        </div>
      </li>
    );
  }
}
