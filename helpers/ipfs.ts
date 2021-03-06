import { File, NFTStorage } from "nft.storage";

const client = new NFTStorage({
  token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN
});

export async function uploadToIPFS(data: any) {
  if (!data) throw Error("Data is invalid");
  return await client.store(data);
}

export function buildMetadata(
  artist: string,
  name: string,
  description: string,
  image: File,
  audio: File,
  attributes: Attribute[],
  licence: File,
  documents: File[]
) {
  const data = {
    artist,
    name,
    factory_id: "19d2209e-6701-46ec-ae05-33b4a3e741f1",
    description,
    image: new File([image], image.name, {
      type: image.type
    }),
    audio: new File([audio], audio.name, {
      type: audio.type
    }),
    release_type: "audio",
    ...(attributes &&
      attributes.length && {
        attributes: attributes.map((attribute) => ({
          trait_type: attribute.trait_type,
          value: attribute.value.trim().split(" ").join("-").toLowerCase()
        }))
      }),
    ...(licence && {
      licence: new File([licence], licence.name, {
        type: licence.type
      })
    }),
    ...(documents && {
      documents: documents.map(
        (document, i) =>
          new File([document], `${document.name}`, {
            type: document.type
          })
      )
    })
  };

  return data;
}

export function transformURL(url: string) {
  return url.replace("ipfs://", "https://ipfs.infura.io/ipfs/");
}
