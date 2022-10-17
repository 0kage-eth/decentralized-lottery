import { HardhatRuntimeEnvironment } from "hardhat/types"
import { developmentChains } from "../helper-hardhat-config"
import { zKAGE_MOCK_SUPPLY } from "../constants"

const deployMocks = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, network, getNamedAccounts, ethers } = hre
    const BASE_FEE = "250000000000000000"
    const GAS_PRICE_PER_LINK = 1e9

    const { deployer } = await getNamedAccounts()

    const { deploy, log } = deployments

    if (developmentChains.includes(network.name)) {
        log("Local network detected... Deploying mocks...")

        log("Deploying VRF Coordinator Mock...")
        const args: any = [BASE_FEE, GAS_PRICE_PER_LINK]
        const tx = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: 1,
        })

        // once VRFCoordinatorV2Mock is created, first thing we need to do is assign a subscription Id

        // const vrfMockContract: VRFCoordinatorV2Mock = await ethers.getContract(
        //     "VRFCoordinatorV2Mock"
        // )
        log("---------------------------")

        log("Deploying Zero Kage Mock")
        const zArgs = [ethers.utils.parseEther(zKAGE_MOCK_SUPPLY)]
        const deployTx = await deploy("ZeroKageMock", {
            from: deployer,
            log: true,
            args: zArgs,
            waitConfirmations: 1,
        })

        log("---------------------------")

        // log(`VRFCoordinatorV2Mock deployed at ${tx.address}; txn hash: ${tx.transactionHash}`)
    }
}

export default deployMocks

deployMocks.tags = ["all", "main", "main0Kage", "mocks"]
