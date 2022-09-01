import { HardhatRuntimeEnvironment } from "hardhat/types"
import { networkConfig } from "../helper-hardhat-config"

const deployDateTime = async (hre: HardhatRuntimeEnvironment) => {
    try {
        const { deployments, network, getNamedAccounts } = hre
        const chainId = network.config.chainId
        const { deployer } = await getNamedAccounts()
        const { deploy, log } = deployments

        log("deploying DateTime contract...")
        if (chainId) {
            const tx = await deploy("DateTime", {
                from: deployer,
                log: true,
                waitConfirmations: networkConfig[chainId!].blockConfirmations || 1,
            })
            //           log(`tx deployed at ${tx.address} and has transaction hash ${tx.transactionHash}`)
        } else {
            log("Unrecognized chain - abandoning deployment...")
        }
    } catch (e) {
        console.log("Error deploying datetime contract")
        console.error(e)
    }
}

export default deployDateTime

deployDateTime.tags = ["all", "main", "datetime"]
