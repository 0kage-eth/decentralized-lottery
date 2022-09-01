import { HardhatRuntimeEnvironment } from "hardhat/types"
import { networkConfig, developmentChains } from "../helper-hardhat-config"

const deploySmaryLottery = async (hre: HardhatRuntimeEnvironment) => {
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

            if (developmentChains.includes(network.name)) {
                const vrfCoordinatorContract = await ethers.getContract("VRFCoordinatorV2Mock")
                vrfCoordinatorAddress = vrfCoordinatorContract.address
            } else {
                vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinator!
            }

            const args: any = [
                vrfCoordinatorAddress,
                keyHash,
                subscriptionId,
                numConfirmations,
                numWords,
                callbackGasLimit,
            ]

            const tx = await deploy("SmartLottery", {
                from: deployer,
                args: args,
                log: true,
                waitConfirmations: networkConfig[chainId!].blockConfirmations || 1,
            })

            //            log(`tx deployed at ${tx.address} and has transaction hash ${tx.transactionHash}`)
        } else {
            log("Chain id unrecognized. Abandoned deployment..")
        }
    } catch (e) {
        console.log("Error deploying smart lottery")
        console.error(e)
    }
}

export default deploySmaryLottery

deploySmaryLottery.tags = ["all", "main", "lottery"]
