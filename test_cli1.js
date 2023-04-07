#!/usr/bin/env node

require("dotenv").config();
const Web3 = require("web3");
const { PoofKit } = require("./dist");
const { getProofDeps } = require("./dist");
const { toWei, toBN, fromWei } = require("web3-utils");
const yargs = require("yargs");
const snarkjs = require("snarkjs");
const ERC20Artifact = require("./dist/artifacts/ERC20.json");

const { PRIVATE_KEY, RPC_URL, POOF_PRIVATE_KEY } = process.env;
const web3 = new Web3(RPC_URL);
const { address: senderAccount } = web3.eth.accounts.wallet.add(PRIVATE_KEY);
const poofKit = new PoofKit(web3);

let netId, explorer, gasPrice, depsInitialized;
const gas = 1.7e6;
console.log(`ok`)
const init = async (skipDeps, provingSystem) => {
  netId = await web3.eth.getChainId();
  console.log(netId)
  poofKit.initialize(() => snarkjs);

  console.log(`before  if (!skipDeps ) {`)
  if (!skipDeps ) {
    console.log(` if (!skipDeps ) {`)
    // Initialize deps
    await getProofDeps([
      provingSystem === 1
        ? "./depends/Deposit/deposit=1/Deposit2 (1).wasm.gz"
        : "./depends/Deposit/Deposit.wasm.gz",
      provingSystem === 1
        ? "./depends/Deposit/deposit=1/Deposit2_circuit_final.zkey.gz"
        : "./depends/Deposit/Deposit_circuit_final.zkey.gz",
    ]).then((deps) =>
      poofKit.initializeDeposit(
        async () => deps[0],
        async () => deps[1]
      )
    );
    await getProofDeps([
      provingSystem === 1
        ? "./depends/withdraw/poof.nyc3.cdn.digitaloceanspaces.com:Withdraw2.wasm/Withdraw2.wasm.gz"
        : "./depends/withdraw/poofgroth.nyc3.cdn.digitaloceanspaces.com:Withdraw.wasm/Withdraw.wasm.gz",
      provingSystem === 1
        ? "./depends/withdraw/poof.nyc3.cdn.digitaloceanspaces.com:Withdraw2_circuit_final.zkey/Withdraw2_circuit_final.zkey.gz"
        : "./depends/withdraw/poofgroth.nyc3.cdn.digitaloceanspaces.com:Withdraw_circuit_final.zkey/Withdraw_circuit_final.zkey.gz",
    ]).then((deps) =>
      poofKit.initializeWithdraw(
        async () => deps[0],
        async () => deps[1]
      )
    );

    await getProofDeps([
      provingSystem === 1
        ? "./depends/Inputroot/Inputroot_1/InputRoot.wasm.gz"
        : "./depends/Inputroot/Inputroot_not1/InputRoot.wasm.gz",
      provingSystem === 1
        ? "./depends/Inputroot/Inputroot_1/InputRoot_circuit_final.zkey.gz"
        : "./depends/Inputroot/Inputroot_not1/InputRoot_circuit_final.zkey.gz",
    ]).then((deps) =>
      poofKit.initializeInputRoot(
        async () => deps[0],
        async () => deps[1]
      )
    );
    await getProofDeps([
      provingSystem === 1
        ? "./depends/OutputRoot/Outputroot1/OutputRoot.wasm.gz"
        : "./depends/OutputRoot/Outputrootnot1/OutputRoot.wasm.gz",
      provingSystem === 1
        ? "./depends/OutputRoot/Outputroot1/OutputRoot_circuit_final.zkey.gz"
        : "./depends/OutputRoot/Outputrootnot1/OutputRoot_circuit_final.zkey.gz",
    ]).then((deps) =>
      poofKit.initializeOutputRoot(
        async () => deps[0],
        async () => deps[1]
      )
    );
    depsInitialized = true;
  }
};
init(false,0)
