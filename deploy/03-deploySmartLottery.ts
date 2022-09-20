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
