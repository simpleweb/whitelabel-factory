import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { Button, ExplorerLink } from "../components";
import { useWalletStore } from "../stores";

export default function Header() {
  const { address, onboard, resetWallet } = useWalletStore();
  const { push } = useRouter();
  const { t } = useTranslation("common");

  async function connect() {
    try {
      if (onboard) {
        await onboard.walletSelect();
        await onboard.walletCheck();
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function handleReset() {
    window.localStorage.removeItem("selectedWallet");
    resetWallet();

    await onboard.walletReset();
  }

  return (
    <header className="w-full py-2 px-2">
      <div className="flex items-center justify-between">
        <a href="/">
          <h1 className="text-2xl font-bold text-white">{t("header.name")}</h1>
          <p className="font-bold text-pink-500">{t("header.tagline")}</p>
        </a>
        <div className="flex items-center">
          {address ? (
            <div className="flex items-center space-x-5">
              <ExplorerLink address={address} />
              <Button onClick={handleReset}>{t("wallet.disconnect_button")}</Button>
              <Button onClick={() => push(`/user/${address}`)}>{t("header.user_releases")}</Button>
            </div>
          ) : (
            <Button onClick={connect}>{t("wallet.connect_button")}</Button>
          )}
        </div>
      </div>
    </header>
  );
}
