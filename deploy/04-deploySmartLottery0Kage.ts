import { HardhatRuntimeEnvironment } from "hardhat/types"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { verify } from "../utils/verify"
import { GOERLI_ZEROKAGE_ADDRESS } from "../constants"

// Deploy Smart Lottery 0KAGE version - where all payments and rewards are in 0KAGE terms

const deploySmaryLottery0Kage = async (hre: HardhatRuntimeEnvironment) => {
    try {
        const { deployments, network, getNamedAccounts, ethers } = hre
        const { deploy, log } = deployments
        const { deployer } = await getNamedAccounts()

        const chainId = network.config.chainId
        log("Deploying smart lottery contract...")

        if (chainId) {
            let vrfCoordinatorAddress: string
            let keyHash: string = networkConfig[chainId].keyHash!
            let subscriptionId: string = networkConfig[chainId].subscriptionId!
            let numConfirmations: number = networkConfig[chainId].blockConfirmations!
            let numWords: number = 1
            let callbackGasLimit: string = networkConfig[chainId].callbackGasLimit!
            let zKageAddress
            if (developmentChains.includes(network.name)) {
                const vrfCoordinatorContract = await ethers.getContract("VRFCoordinatorV2Mock")
                // console.log("vrf coordinator address", vrfCoordinatorContract.address)
                vrfCoordinatorAddress = vrfCoordinatorContract.address

                // creating a subscription id
                // this is important for random number to work
                const subTx = await vrfCoordinatorContract.createSubscription()
                const subReceipt = await subTx.wait(1)
                subscriptionId = subReceipt.events![0].args!["subId"]

                const fundTx = await vrfCoordinatorContract.fundSubscription(
                    subscriptionId,
                    ethers.utils.parseEther("1")
                )
                await fundTx.wait(1)

                // Get ZKage
                const zKageContract = await ethers.getContract("ZeroKageMock")
                zKageAddress = zKageContract.address
            } else {
                vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinator!
                zKageAddress = GOERLI_ZEROKAGE_ADDRESS
            }

            const args: any = [
                vrfCoordinatorAddress,
                keyHash,
                subscriptionId,
                numConfirmations,
                numWords,
                callbackGasLimit,
                zKageAddress,
            ]

            const tx = await deploy("SmartLottery0Kage", {
                from: deployer,
                args: args,
                log: true,
                waitConfirmations: networkConfig[chainId!].blockConfirmations || 1,
            })

            if (!developmentChains.includes(network.name)) {
                await verify(tx.address, args)
            }

            //            log(`tx deployed at ${tx.address} and has transaction hash ${tx.transactionHash}`)
        } else {
            log("Chain id unrecognized. Abandoned deployment..")
        }
    } catch (e) {
        console.log("Error deploying smart lottery")
        console.error(e)
    }
}

export default deploySmaryLottery0Kage

deploySmaryLottery0Kage.tags = ["all", "main", "main0Kage", "lottery0Kage"]
