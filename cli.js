#!/usr/bin/env node

require("dotenv").config();
const Web3 = require("web3");
const ContractKit = require("@celo/contractkit");
const { PoofKit } = require("./dist");
const { toWei, toBN, fromWei } = require("web3-utils");
const yargs = require("yargs");
const snarkjs = require("snarkjs");

const { PRIVATE_KEY, RPC_URL, POOF_PRIVATE_KEY } = process.env;
const web3 = new Web3(RPC_URL);
const kit = ContractKit.newKitFromWeb3(web3);
kit.connection.addAccount(PRIVATE_KEY);

let poofKit, netId, explorer, senderAccount;

const init = async () => {
  netId = await kit.web3.eth.getChainId();
  poofKit = new PoofKit(kit.web3);
  poofKit.initialize(snarkjs);
  explorer =
    netId === 44787
      ? "https://alfajores-blockscout.celo-testnet.org"
      : "https://explorer.celo.org";
  senderAccount = (await kit.web3.eth.getAccounts())[0];
};
const getExplorerTx = (hash) => {
  return `${explorer}/tx/${hash}`;
};

yargs
  .scriptName("poof-v2-cli")
  .usage("$0 <cmd> [args]")
  .command(
    "allowance <currency>",
    "Get the allowance for an ERC20 by the proxy contract",
    (yargs) => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to check",
      });
    },
    async (argv) => {
      await init();
      const { currency } = argv;
      console.log(await poofKit.allowance(currency, senderAccount));
    }
  )
  .command(
    "approve <currency>",
    "Allow for 100 units of an ERC20 token",
    (yargs) => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to approve",
      });
    },
    async (argv) => {
      await init();
      const { currency } = argv;
      const approveTxo = await poofKit.approve(currency, toWei("100"));
      const tx = await approveTxo.send({ from: senderAccount });
      console.log(`Transaction: ${getExplorerTx(tx.transactionHash)}`);
    }
  )
  .command(
    "deposit <currency> <amount>",
    "Deposit into Poof",
    (yargs) => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to deposit",
      });
      yargs.positional("amount", {
        type: "string",
        describe: "The amount to deposit",
      });
    },
    async (argv) => {
      await init();
      const { currency, amount } = argv;
      const depositTxo = await poofKit.deposit(
        POOF_PRIVATE_KEY,
        currency,
        toBN(toWei(amount)),
        0 // Operation.DEPOSIT
      );
      const tx = await depositTxo.send({ from: senderAccount });
      console.log(`Transaction: ${getExplorerTx(tx.transactionHash)}`);
    }
  )
  .command(
    "burn <currency> <amount>",
    "Deposit into Poof",
    (yargs) => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to deposit",
      });
      yargs.positional("amount", {
        type: "string",
        describe: "The amount to deposit",
      });
    },
    async (argv) => {
      await init();
      const { currency, amount } = argv;
      const burnTxo = await poofKit.deposit(
        POOF_PRIVATE_KEY,
        currency,
        toBN(toWei(amount)),
        3 // Operation.BURN
      );
      const tx = await burnTxo.send({ from: senderAccount });
      console.log(`Transaction: ${getExplorerTx(tx.transactionHash)}`);
    }
  )
  .command(
    "withdraw <currency> <amount> [recipient] [relayerUrl]",
    "Withdraw from Poof",
    (yargs) => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to withdraw",
      });
      yargs.positional("amount", {
        type: "string",
        describe: "The amount to withdraw",
      });
      yargs.positional("recipient", {
        type: "string",
        describe: "The recipient address to send the withdrawal",
      });
      yargs.positional("relayerUrl", {
        type: "string",
        describe: "Optional relayer URL for withdrawal",
      });
    },
    async (argv) => {
      await init();
      const { currency, amount, recipient, relayerUrl } = argv;
      const res = await poofKit.withdraw(
        POOF_PRIVATE_KEY,
        currency,
        toBN(toWei(amount)),
        recipient || senderAccount,
        1, // Operation.WITHDRAW
        relayerUrl
      );
      if (relayerUrl) {
        const hash = res;
        console.log(`Transaction: ${getExplorerTx(hash)}`);
      } else {
        const txo = res;
        const tx = await txo.send({ from: senderAccount });
        console.log(`Transaction: ${getExplorerTx(tx.transactionHash)}`);
      }
    }
  )
  .command(
    "mint <currency> <amount> [recipient] [relayerUrl]",
    "Mint tokens collateralized on hidden balance",
    (yargs) => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to withdraw",
      });
      yargs.positional("amount", {
        type: "string",
        describe: "The amount to withdraw",
      });
      yargs.positional("recipient", {
        type: "string",
        describe: "The recipient address to send the withdrawal",
      });
      yargs.positional("relayerUrl", {
        type: "string",
        describe: "Optional relayer URL for withdrawal",
      });
    },
    async (argv) => {
      await init();
      const { currency, amount, recipient, relayerUrl } = argv;
      const res = await poofKit.withdraw(
        POOF_PRIVATE_KEY,
        currency,
        toBN(toWei(amount)),
        recipient || senderAccount,
        2, // Operation.MINT
        relayerUrl
      );
      if (relayerUrl) {
        const hash = res;
        console.log(`Transaction: ${getExplorerTx(hash)}`);
      } else {
        const txo = res;
        const tx = await txo.send({ from: senderAccount });
        console.log(`Transaction: ${getExplorerTx(tx.transactionHash)}`);
      }
    }
  )
  .command(
    "account",
    "Get a new private key",
    () => {},
    () => {
      const privateKey = web3.eth.accounts.create().privateKey.slice(2);
      console.log(privateKey);
    }
  )
  .command(
    "balance [currency]",
    "Get hidden balance",
    () => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to check hidden balance of",
      });
    },
    async (argv) => {
      await init();
      const { currency } = argv;
      const balance = await poofKit.hiddenBalance(POOF_PRIVATE_KEY, currency);
      console.log(`${fromWei(balance)} ${currency}`);
    }
  )
  .command(
    "verify [currency]",
    "Get pool details",
    () => {
      yargs.positional("currency", {
        type: "string",
        describe: "The ERC20 symbol to verify",
      });
    },
    async (argv) => {
      await init();
      const { currency } = argv;
      const res = await poofKit.verify(currency);
      console.log(res);
    }
  )
  .command(
    "test [relayerUrl]",
    "Deposit, withdraw",
    (yargs) => {
      yargs.positional("relayerUrl", {
        type: "string",
        describe: "Optional relayer URL for withdrawal",
      });
    },
    async (argv) => {
      await init();
      const { relayerUrl } = argv;

      const currency = "cUSD";
      const amount = toBN("1000");

      // Approve
      const approveTxo = await poofKit.approve(currency, toWei("1000000"));
      const approveTx = await approveTxo.send({ from: senderAccount });
      console.log(`Approve: ${getExplorerTx(approveTx.transactionHash)}`);

      // Deposit
      const depositTxo = await poofKit.deposit(
        POOF_PRIVATE_KEY,
        currency,
        amount
      );
      const depositTx = await depositTxo.send({ from: senderAccount });
      console.log(`Deposit: ${getExplorerTx(depositTx.transactionHash)}`);

      // Withdraw
      const res = await poofKit.withdraw(
        POOF_PRIVATE_KEY,
        currency,
        amount,
        senderAccount,
        relayerUrl
      );
      if (relayerUrl) {
        const hash = res;
        console.log(`Withdraw: ${getExplorerTx(hash)}`);
      } else {
        const txo = res;
        const tx = await txo.send({ from: senderAccount });
        console.log(`Withdraw: ${getExplorerTx(tx.transactionHash)}`);
      }
    }
  )
  .help().argv;
