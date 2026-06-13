import "dotenv/config";

export const SUI_RPC = "https://fullnode.mainnet.sui.io:443";

export const OLLAMA = {
  host: process.env.OLLAMA_HOST || "https://ollama.com",
  key: process.env.OLLAMA_KEY || "",
  // qwen3.5-cloud requires a paid subscription on this account; qwen3-vl:235b-instruct
  // is accessible and clean. Override via OLLAMA_MODEL.
  model: process.env.OLLAMA_MODEL || "qwen3-vl:235b-instruct",
};

export const MEMWAL = {
  packageId: process.env.MEMWAL_PACKAGE_ID || "0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6",
  registryId: process.env.MEMWAL_REGISTRY_ID || "0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd",
  serverUrl: process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz",
  accountId: process.env.MEMWAL_ACCOUNT_ID || "",
  delegateKey: process.env.MEMWAL_DELEGATE_KEY || "",
  namespace: process.env.MEMWAL_NAMESPACE || "pundit-smoke",
};

export const PUNDIT = {
  packageId: process.env.NEXT_PUBLIC_PUNDIT_PACKAGE_ID || "0xe12154f96dd7b13d999d04f69fb792c48ac9b0d82c8eaf2c42ac113f538d136f",
  registryId: process.env.NEXT_PUBLIC_PUNDIT_REGISTRY_ID || "0xc4f4dd4183f14ca23c8a795a39f84cc5177d45f3536e6b9acc586a3d1db6cf73",
};
