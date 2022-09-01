import { HardhatRuntimeEnvironment } from "hardhat/types"
import { developmentChains } from "../helper-hardhat-config"

const deployMocks = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, network, getNamedAccounts, ethers } = hre
    const BASE_FEE = "250000000000000000"
    const GAS_PRICE_PER_LINK = 1e9

    const { deployer } = await getNamedAccounts()

    const { deploy, log } = deployments

    if (developmentChains.includes(network.name)) {
        log("Local network detected... Deploying mocks...")
        const args: any = [BASE_FEE, GAS_PRICE_PER_LINK]
        const tx = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: 1,
        })

        // log(`VRFCoordinatorV2Mock deployed at ${tx.address}; txn hash: ${tx.transactionHash}`)
    }
}

export default deployMocks

deployMocks.tags = ["all", "main", "mocks"]
