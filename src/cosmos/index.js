import * as bech32 from "bech32";
import * as bip32 from "bip32";
import * as bip39 from "bip39";

import bitcoinjs from "bitcoinjs-lib";
import crypto from "crypto";

import * as dotenv from "dotenv"
dotenv.config();

export class Cosmos {
  constructor(apiUrl, chainId, addressPrefix = "cosmos") {
    this.apiUrl = apiUrl;
    this.chainId = chainId;
    this.path = "m/44'/118'/0'/0/0";
    this.addressPrefix = process.env.COSMOS_ADDRESS_PREFIX;
  }

  // strength(128): 12 words, strength(256): 24 words
  generateMnemonic(strength = 256) {
    return bip39.generateMnemonic(strength);
  }

  setAddressPrefix(prefix) {
    this.addressPrefix = prefix;
    if (!this.addressPrefix)
      throw new Error("addressPrefix object was not set or invalid");
  }

  setPath(value) {
    this.path = value;
    if (!this.path) throw new Error("path object was not set or invalid");
  }

  getAddress(mnemonic, checkSum = true) {
    if (typeof mnemonic !== "string") {
      throw new Error("mnemonic expects a string");
    }
    if (checkSum) {
      if (!bip39.validateMnemonic(mnemonic))
        throw new Error("mnemonic phrases have invalid checksums");
    }
    const seed = bip39.mnemonicToSeed(mnemonic);
    const node = bip32.fromSeed(seed);
    const child = node.derivePath(this.path);
    const words = bech32.toWords(child.identifier);
    return bech32.encode(this.addressPrefix, words);
  }
}

function toHex(str,hex){
	try {
		hex = unescape(encodeURIComponent(str)).split('').map(function(v) {
			return v.charCodeAt(0).toString(16) 
		}).join('')
	} catch(e) {
		hex = str
		console.log('invalid text input: ' + str)
	}
	return hex
}
