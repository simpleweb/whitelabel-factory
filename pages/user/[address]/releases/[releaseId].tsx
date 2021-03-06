import { ExternalLinkIcon } from "@heroicons/react/outline";
import dayjs from "dayjs";
import { ethers } from "ethers";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import theFactory from "../../../../abis/theFactory.json";
import { Button, ExplorerLink } from "../../../../components";
import {
  dismissNotification,
  errorNotification,
  formatRevert,
  getMetadataValue,
  loadingNotification,
  successNotification,
  transformURL
} from "../../../../helpers";
import { useRelease } from "../../../../queries";
import { useWalletStore } from "../../../../stores";

export default function DashboardPage() {
  const { query, push } = useRouter();
  const { wallet, address: connectedAddress } = useWalletStore();
  const [refetchInterval, setRefetchInterval] = useState(0);
  const { t } = useTranslation("common");
  const [address, setAddress] = useState<string>();
  const { data, error, isLoading } = useRelease(address?.toLowerCase(), refetchInterval);

  useEffect(() => {
    // @dev The subgraph can take a second to pick up on
    // the blockchain events. This functions polls until there is data.
    if (query?.releaseId && !data) {
      setRefetchInterval(1000);
    } else {
      setRefetchInterval(0);
    }
  }, [query?.releaseId, data]);

  const { register, handleSubmit } = useForm();

  useEffect(() => {
    if (query?.releaseId) {
      setAddress(query.releaseId.toString());
    }
  }, [query?.releaseId]);

  if (isLoading) return <div>Loading release....</div>;
  if (error) return <div>There was an error: {error?.message}</div>;

  function handleAddressSubmit(data) {
    if (data.release_address && ethers.utils.isAddress(data.release_address)) {
      push(`/user/${connectedAddress.toLowerCase()}/${data.release_address.toLowerCase()}`);
    }
  }

  if (!query.releaseId)
    return (
      <form
        className="flex flex-col items-center justify-center"
        onSubmit={handleSubmit(handleAddressSubmit)}
      >
        <input
          className="w-1/3"
          type="text"
          placeholder="enter release contract address"
          {...register("release_address")}
        />
        <div className="my-2">
          <Button>SUBMIT</Button>
        </div>
      </form>
    );

  async function releaseFundsToStakeholder(address: string) {
    if (wallet.provider && query.releaseId) {
      try {
        const provider = new ethers.providers.Web3Provider(wallet.provider);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(query.releaseId.toString(), theFactory.abi, signer);

        const tx = await contract["release(address)"](address);
        const pendingTx = loadingNotification("Pending transaction...", 30000);
        await tx.wait();
        dismissNotification(pendingTx);
        successNotification("Funds released");
      } catch (e: any) {
        errorNotification(formatRevert(e?.message));
      }
    }
  }

  function StatsCard({ children }) {
    return (
      <li className="gradient-primary flex justify-center rounded-lg py-20 shadow">
        <div className="flex flex-col items-center justify-center space-x-2">{children}</div>
      </li>
    );
  }

  function MetadataCard() {
    const name = getMetadataValue(data.metadata, "name");
    const description = getMetadataValue(data.metadata, "description");

    const items = [
      { title: "Track Name", value: name },
      { title: "Track Symbol", value: data.symbol },
      { title: "Track Description", value: description }
    ];
    return (
      <li className="gradient-primary flex justify-center rounded-lg py-10 shadow">
        <div className="flex flex-col items-center justify-center space-x-2">
          {items.map(({ title, value }, i) => (
            <div className="py-2 text-center" key={i}>
              <p className="text-lg font-bold ">{title}</p>
              <p className="text-black">{value}</p>
            </div>
          ))}
          {data.licence && (
            <a href={transformURL(data?.licence)} rel="noreferrer" target="_blank">
              <div className="flex py-5 hover:text-teal-300">
                <p className="text-lg font-bold">View Licence</p>
                <ExternalLinkIcon className="mx-2 h-6 w-6" />
              </div>
            </a>
          )}
        </div>
      </li>
    );
  }

  function MediaCard() {
    const image = getMetadataValue(data.metadata, "image");
    const audio = getMetadataValue(data.metadata, "audio");
    return (
      <li className="flex justify-center rounded-lg">
        <div className="flex flex-col items-center justify-center space-y-2">
          <img loading="lazy" className="rounded-lg" src={transformURL(image)} />
          <audio className="w-full" id="audio" controls>
            <source src={transformURL(audio)} id="src" />
          </audio>
        </div>
      </li>
    );
  }

  function fromWei(amount: string) {
    return ethers.utils.formatEther(amount);
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="gradient-primary-text text-5xl font-semibold leading-loose">
          {t("user.preparing_release")}
        </h1>
      </div>
    );
  }

  if (data) {
    dismissNotification();

    const { symbol, stakeholders, payouts, saleData } = data;

    return (
      <div className="grid lg:grid-cols-5">
        <div className="grid grid-rows-3 gap-5 lg:col-span-3 lg:grid-cols-3 lg:grid-rows-none">
          <StatsCard>
            <p>Total Sold</p>
            <p className="text-5xl font-semibold">{`${saleData.totalSold}/${saleData.maxSupply}`}</p>
            {symbol && <p className="text-sm font-semibold text-black">{symbol}</p>}
          </StatsCard>
          <StatsCard>
            <p>Total Earnings</p>
            <p className="text-5xl font-semibold">{fromWei(saleData.totalEarnings)}</p>
            {symbol && <p className="text-sm font-semibold text-black">MATIC</p>}
          </StatsCard>
          <StatsCard>
            <p>Royalties</p>
            <p className="text-5xl font-semibold">{`${
              parseInt(saleData.royaltiesPercentage) / 100
            }%`}</p>
            {symbol && <p className="text-sm font-semibold text-black">of each secondary sale</p>}
          </StatsCard>
          <StatsCard>
            <p>Sale price</p>
            <p className="text-5xl font-semibold">{fromWei(saleData.salePrice)}</p>
            {symbol && <p className="text-sm font-semibold text-black">MATIC</p>}
          </StatsCard>
          <MetadataCard />
          <MediaCard />
        </div>
        <div className="grid gap-y-5 lg:col-span-2 lg:px-5">
          <div className="gradient-primary w-full bg-white p-5 shadow sm:rounded-md">
            <h1>Shareholders</h1>
            <ul role="list" className="divide-y divide-gray-200">
              {stakeholders.map((stakeholder, i) => (
                <li className="flex items-center justify-between py-2" key={i}>
                  <ExplorerLink address={stakeholder.id.split("-")[0]} />
                  <p>{stakeholder.share}%</p>
                  <Button onClick={() => releaseFundsToStakeholder(stakeholder.id.split("-")[0])}>
                    Release Funds
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          {Boolean(payouts && payouts.length) && (
            <div className="gradient-primary w-full bg-white p-5 shadow sm:rounded-md">
              <h1>Payouts</h1>
              <ul role="list" className="divide-y divide-gray-200">
                {payouts.map((payout, i) => (
                  <li className="flex justify-between py-2" key={i}>
                    <ExplorerLink address={payout.transactionHash} isTx={true} />
                    <p>{fromWei(payout.amount)}MATIC</p>
                    <div>
                      <span>{dayjs.unix(payout.createdAt).format("DD-MM-YYYY")}</span>
                      <span className="mx-2 text-xs">
                        {dayjs.unix(payout.createdAt).format("HH:mm:ss")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    return null;
  }
}
