import { ethers } from "ethers";
import type { NextPage } from "next";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useState } from "react";
import { FileUpload } from "../components";
import { CreateTrackForm } from "../forms";
import {
  buildMetadata,
  createContract,
  dismissNotification,
  errorNotification,
  loadingNotification,
  successNotification,
  uploadToIPFS
} from "../helpers";
import { useFileDataStore, useWalletStore } from "../stores";

const Home: NextPage = () => {
  const { wallet, address } = useWalletStore();
  const { image, audio, licence, documents, setImage, setAudio, setLicence } = useFileDataStore();
  const [isLoading, setLoading] = useState<boolean>(false);
  const { push } = useRouter();
  const { t } = useTranslation("common");

  async function handleCreateContract(data: TrackData) {
    setLoading(true);
    const loading = loadingNotification("Uploading files to IPFS...");

    const {
      attributes,
      artist,
      track_name,
      track_description,
      symbol,
      salePrice,
      stakeholders,
      quantity,
      royalitiesPercentage
    } = data;
    const payees = stakeholders.map((stakeholder) => stakeholder.address);
    const shares = stakeholders.map((stakeholder) => stakeholder.share);

    const metadata = buildMetadata(
      artist,
      track_name,
      track_description,
      image,
      audio,
      attributes,
      licence,
      documents
    );

    const ipfsData = await uploadToIPFS(metadata);
    const { name, description } = ipfsData.data;
    //@todo Sketchy, fix this.
    const metadataIsValid =
      ipfsData.data.artist && ipfsData.data.audio && ipfsData.data.image && name && description;

    dismissNotification(loading);
    if (metadataIsValid) {
      createContract({
        name: "factory",
        provider: wallet?.provider,
        cb: async (factory) => {
          const awaitingTx = loadingNotification("Review and confirm transaction in Metamask...");
          try {
            const contract = await factory.deploy(
              payees,
              shares,
              salePrice ? ethers.utils.parseEther(salePrice.toString()) : 0,
              name,
              symbol,
              quantity,
              royalitiesPercentage ? royalitiesPercentage * 100 : 0,
              ipfsData.url
            );

            dismissNotification(awaitingTx);

            const pendingTx = loadingNotification("Pending transaction...");
            await contract.deployTransaction.wait();

            dismissNotification(pendingTx);
            successNotification("Preparing your release...", "Infinity");

            push(`/user/${address.toLowerCase()}/releases/${contract.address.toLowerCase()}`);

            setLoading(false);
          } catch (e) {
            dismissNotification(awaitingTx);
            errorNotification(`Transaction Error - ${e.message}`);
            setLoading(false);
          }
        }
      });
    } else {
      errorNotification("Error uploading to IPFS, Please try again.");
      setLoading(false);
    }
  }

  function handleFileUpload(e, setter) {
    const files = e.target.files;
    if (files[0]) {
      setter(files[0]);
    }
  }

  const files = [
    {
      name: "audio",
      setter: setAudio,
      label: audio ? audio.name : "Select .mp3",
      text: "Upload audio",
      accept: ".mp3"
    },
    {
      name: "image",
      setter: setImage,
      label: image ? image.name : "Select .png, .jpeg, .jpg",
      text: "Upload artwork",
      accept: ".png, .jpeg, .jpg"
    },
    {
      name: "licence",
      setter: setLicence,
      label: licence ? licence.name : "Select .pdf",
      text: "Upload licence",
      accept: ".pdf"
    }
  ];

  const requiredFilesAdded = Boolean(audio?.name && image?.name);

  return address ? (
    <div>
      {wallet?.provider && (
        <div className="grid grid-cols-1 grid-rows-2 lg:grid-cols-5 lg:gap-5">
          <div className="col-span-1 flex w-full lg:col-span-3">
            <CreateTrackForm
              onCreateTrack={(data) => handleCreateContract(data)}
              isLoading={isLoading}
              requiredFilesAdded={requiredFilesAdded}
            />
          </div>
          <div className="col-span-2 flex flex-col space-y-5">
            <div className="gradient-primary rounded-md">
              <ul className="p-5">
                <h2>Assets</h2>
                {files.map(({ name, setter, label, text, accept }, i) => (
                  <li className="my-2">
                    <FileUpload
                      name={name}
                      onFileUpload={(e) => handleFileUpload(e, setter)}
                      label={label}
                      text={text}
                      accept={accept}
                    />
                  </li>
                ))}
              </ul>
            </div>
            {image && (
              <div>
                <div className="gradient-primary flex flex-col items-center justify-center rounded-md">
                  {image ? (
                    <img className="w-full rounded-md" src={URL.createObjectURL(image)} />
                  ) : (
                    <FileUpload
                      name="image"
                      onFileUpload={(e) => handleFileUpload(e, setImage)}
                      label="Select .mp3"
                      text="Upload Track Artwork"
                      accept=".jpg, .png, .jpeg"
                    />
                  )}
                </div>
              </div>
            )}

            <div>
              {audio && (
                <audio className="w-full" id="audio" controls>
                  <source src={URL.createObjectURL(audio)} id="src" />
                </audio>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="flex items-center justify-center">
      <h1 className="gradient-primary-text text-5xl font-semibold leading-loose">
        {t("wallet.connect_prompt")}
      </h1>
    </div>
  );
};

export default Home;
