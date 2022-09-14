import { ethers, network, getNamedAccounts } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { VRFCoordinatorV2Mock } from "../typechain-types"

const KEY_HASH = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
const NUM_WORDS = 1
const NUM_CONFIRMATIONS = 3
const SUB_ID = 8854
const GAS = 500000

/**
 * @notice created this to test vrf Coordinator Mock
 */

const runVRFCoordinator = async () => {
    if (developmentChains.includes(network.name)) {
        const { deployer } = await getNamedAccounts()
        const vrfMockContract: VRFCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock",
            deployer
        )
        const createSubTx = await vrfMockContract.createSubscription()
        const createSubReceipt = await createSubTx.wait(1)

        const subId = createSubReceipt.events![0].args!.subId
        const reqId = await vrfMockContract.requestRandomWords(
            KEY_HASH,
            subId,
            NUM_CONFIRMATIONS,
            GAS,
            NUM_WORDS
        )

        console.log("request id", reqId)
    }
}

runVRFCoordinator()
    .then(() => {
        console.log("random number generated")
        process.exit(0)
    })
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
