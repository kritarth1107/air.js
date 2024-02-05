import * as bech32 from "bech32";
import * as bip32 from "bip32";
import * as bip39 from "bip39";

import bitcoinjs from "bitcoinjs-lib";
import crypto from "crypto";

import * as dotenv from "dotenv";
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

  changeAddress(prefix, address) {
    try {
      const decode = bech32.decode(address);
      return bech32.encode(prefix, decode.words);
    } catch (e) {
      throw new Error("cannot change address");
      return "";
    }
  }

  getECPairPriv(mnemonic) {
    if (typeof mnemonic !== "string") {
      throw new Error("mnemonic expects a string");
    }
    const seed = bip39.mnemonicToSeed(mnemonic);
    const node = bip32.fromSeed(seed);
    const child = node.derivePath(this.path);
    return child.privateKey;
  }

  getPubKey(privKey) {
    const pubKeyByte = secp256k1.publicKeyCreate(privKey);
    return pubKeyByte;
  }

  getPubKeyAny(privKey) {
    const pubKeyByte = secp256k1.publicKeyCreate(privKey);
    var buf1 = new Buffer.from([10]);
    var buf2 = new Buffer.from([pubKeyByte.length]);
    var buf3 = new Buffer.from(pubKeyByte);
    const pubKey = Buffer.concat([buf1, buf2, buf3]);
    const pubKeyAny = new methods.google.protobuf.Any({
      type_url: "/cosmos.crypto.secp256k1.PubKey",
      value: pubKey,
    });
    return pubKeyAny;
  }

  async wasmQuery(contractAddress, query) {
    let smartQueryApi =
      "/wasm/contract/" +
      contractAddress +
      "/smart/" +
      toHex(query) +
      "?encoding=UTF-8";
    const response = await fetch(this.url + smartQueryApi).then((response) =>
      response.json()
    );
    return response;
  }

  async getAccounts(address) {
    let accountsApi = "/cosmos/auth/v1beta1/accounts/";
    const response = await fetch(this.url + accountsApi + address).then(
      (response) => response.json()
    );

    return response;
  }

  sign(txBody, authInfo, accountNumber, privKey) {
    const bodyBytes = methods.cosmos.tx.v1beta1.TxBody.encode(txBody).finish();
    const authInfoBytes =
      methods.cosmos.tx.v1beta1.AuthInfo.encode(authInfo).finish();
    const signDoc = new methods.cosmos.tx.v1beta1.SignDoc({
      body_bytes: bodyBytes,
      auth_info_bytes: authInfoBytes,
      chain_id: this.chainId,
      account_number: Number(accountNumber),
    });
    let signMessage =
      methods.cosmos.tx.v1beta1.SignDoc.encode(signDoc).finish();
    const hash = crypto.createHash("sha256").update(signMessage).digest();
    const sig = secp256k1.sign(hash, Buffer.from(privKey));
    const txRaw = new methods.cosmos.tx.v1beta1.TxRaw({
      body_bytes: bodyBytes,
      auth_info_bytes: authInfoBytes,
      signatures: [sig.signature],
    });
    const txBytes = methods.cosmos.tx.v1beta1.TxRaw.encode(txRaw).finish();
    const txBytesBase64 = Buffer.from(txBytes, "binary").toString("base64");
    return txBytes;
  }

  // "BROADCAST_MODE_UNSPECIFIED", "BROADCAST_MODE_BLOCK", "BROADCAST_MODE_SYNC", "BROADCAST_MODE_ASYNC"
  broadcast(signedTxBytes, broadCastMode = "BROADCAST_MODE_SYNC") {
    const txBytesBase64 = Buffer.from(signedTxBytes, "binary").toString(
      "base64"
    );

    var options = {
      method: "POST",
      url: this.url + "/cosmos/tx/v1beta1/txs",
      headers: { "Content-Type": "application/json" },
      body: { tx_bytes: txBytesBase64, mode: broadCastMode },
      json: true,
    };

    return new Promise(function (resolve, reject) {
      request(options, function (error, response, body) {
        if (error) return reject(error);
        try {
          resolve(body);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

function toHex(str, hex) {
  try {
    hex = unescape(encodeURIComponent(str))
      .split("")
      .map(function (v) {
        return v.charCodeAt(0).toString(16);
      })
      .join("");
  } catch (e) {
    hex = str;
    console.log("invalid text input: " + str);
  }
  return hex;
}
