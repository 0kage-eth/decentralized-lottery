import { HardhatUserConfig } from "hardhat/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "@nomicfoundation/hardhat-chai-matchers"
import "hardhat-gas-reporter"
import "dotenv/config"
import "solidity-coverage"
import "hardhat-deploy"
import "solidity-coverage"
import "@typechain/hardhat"

const MAINNET_RPC_URL =
    process.env.MAINNET_RPC_URL ||
    process.env.ALCHEMY_MAINNET_RPC_URL ||
    "https://eth-mainnet.g.alchemy.com/v2/Zv64VRt8gJpXcz987ld3JVYXLtdVlxUZ"
const RINKEBY_RPC_URL =
    process.env.RINKEBY_RPC_URL ||
    "https://eth-rinkeby.alchemyapi.io/v2/7GqOn2J6cQ9yN-tLeSrB3eKweLhdCYWP"
const GOERLI_RPC_URL =
    process.env.GOERLI_RPC_URL ||
    "https://eth-goerli.g.alchemy.com/v2/dQntebXGpHJbryB4EfeBHSx4FB9q8Dt_"
const POLYGON_MAINNET_RPC_URL =
    process.env.POLYGON_MAINNET_RPC_URL ||
    "https://polygon-mainnet.g.alchemy.com/v2/Y5OiOarO4GBHWfYKFKKudiayPQfOkuoi"

const PRIVATE_KEY = process.env.PRIVATE_KEY
const PRIVATE_KEY_PLAYER1 = process.env.PRIVATE_KEY_PLAYER1
const PRIVATE_KEY_PLAYER2 = process.env.PRIVATE_KEY_PLAYER2

// this needs to be revisited
const FORKING_BLOCK_NUMBER = process.env.FORKING_BLOCK_NUMBER

// Your API key for Etherscan, obtain one at https://etherscan.io/
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "QFPFCMBSIMC577HAITPS1DJMGT7G9P9KT7"
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key"
const boolREPORT_GAS = process.env.REPORT_GAS || false

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // If you want to do some forking set `enabled` to true
            forking: {
                url: MAINNET_RPC_URL,
                // blockNumber: FORKING_BLOCK_NUMBER, // TO DO
                enabled: false,
            },
            allowUnlimitedContractSize: true,
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
            allowUnlimitedContractSize: true,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts:
                PRIVATE_KEY !== undefined &&
                PRIVATE_KEY_PLAYER1 !== undefined &&
                PRIVATE_KEY_PLAYER2 !== undefined
                    ? [PRIVATE_KEY, PRIVATE_KEY_PLAYER1, PRIVATE_KEY_PLAYER2]
                    : [],
            //accounts: {
            //     mnemonic: MNEMONIC,
            // },
            saveDeployments: true,
            chainId: 5,
        },
        rinkeby: {
            url: RINKEBY_RPC_URL,
            accounts:
                PRIVATE_KEY !== undefined &&
                PRIVATE_KEY_PLAYER1 !== undefined &&
                PRIVATE_KEY_PLAYER2 !== undefined
                    ? [PRIVATE_KEY, PRIVATE_KEY_PLAYER1, PRIVATE_KEY_PLAYER2]
                    : [],
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 4,
        },
        mainnet: {
            url: MAINNET_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 1,
        },
        polygon: {
            url: POLYGON_MAINNET_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 137,
        },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
            goerli: ETHERSCAN_API_KEY,
            polygon: POLYGONSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        player1: {
            default: 1,
        },
        player2: {
            default: 2,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.7",
            },
            {
                version: "0.6.6",
            },
        ],
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
}

export default config
