import { Cosmos } from "../src/cosmos/index.js";

const cosmosClient = new Cosmos("", "");
cosmosClient.setAddressPrefix("air");
const mnemonic = cosmosClient.generateMnemonic();
const address = cosmosClient.getAddress(mnemonic);
console.log(mnemonic);
console.log(address);
