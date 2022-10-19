import { ethers, network, getNamedAccounts } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { SmartLottery0Kage, VRFCoordinatorV2Mock } from "../typechain-types"
import { WinnerAnnouncedEvent } from "../typechain-types/contracts/SmartLottery"
import { shiftTimeTo } from "../utils/shiftTime"

// helper script that mocks winner selection
// used to check front end updates correctly
export const announceWinner = async () => {
    console.log("************* close lottery and announce winner *****************")
    if (developmentChains.includes(network.name)) {
        // actions will be same as what we have doen in testing
        // mock on local - inorder to test all front end functionality is correct, we need to mock winner
        // step 1 - checkupkeep
        const accounts = await ethers.getSigners()
        const lotteryContract: SmartLottery0Kage = await ethers.getContract(
            "SmartLottery0Kage",
            accounts[0].address
        )

        const vrfContract: VRFCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock",
            accounts[0].address
        )

        const currentBlockNum = await ethers.provider.getBlockNumber()
        const currentBlock = await ethers.provider.getBlock(currentBlockNum)
        const currentTimeStamp = currentBlock.timestamp
        console.log("current block number", currentBlockNum)
        console.log("current time stamp", currentTimeStamp)

        const startLotteryTime = await lotteryContract.getStartTime()
        const endLotteryTime = await lotteryContract.getEndTime()
        console.log(
            "Start time before lottery closed:",
            ethers.utils.formatUnits(startLotteryTime, "wei")
        )
        console.log(
            "End time before lottery closed:",
            ethers.utils.formatUnits(endLotteryTime, "wei")
        )

        if (endLotteryTime.gt(currentTimeStamp)) {
            console.log("shifting time to after lottery end time")
            await shiftTimeTo(endLotteryTime.add(10))
        }
        console.log("calling check upkeep - this should stop lottery. Checkupkeep should be true")

        const checkUpkeep = await lotteryContract.checkUpkeep("0x")
        console.log("is checkupkeep needed", checkUpkeep)

        const isStopped = await lotteryContract.getStatus()
        console.log("lottery status, 0-open, 1-closed", isStopped)

        if (checkUpkeep) {
            console.log("checkupkeep true -> calling perform upkeep to generate request id")
            const performUpkeepTx = await lotteryContract.performUpkeep("0x")
            const performReceipt = await performUpkeepTx.wait(1)

            const requestId = performReceipt.events![1].args!["requestId"]
            console.log("request Id for random numbers", requestId)

            // step 2 - perform upkeep
            await new Promise(async (resolve, reject) => {
                lotteryContract.on("WinnerAnnounced", async () => {
                    try {
                        const winnerAnnouncedFilter = lotteryContract.filters.WinnerAnnounced()
                        const winnerEvent: WinnerAnnouncedEvent[] =
                            await lotteryContract.queryFilter(winnerAnnouncedFilter)
                        console.log("winner is:", winnerEvent[0].args.winner)
                        console.log(
                            "reward is:",
                            ethers.utils.formatEther(winnerEvent[0].args.reward)
                        )
                        console.log("fee is:", ethers.utils.formatEther(winnerEvent[0].args.fee))
                        resolve("")
                    } catch (e) {
                        console.log(e)
                        reject()
                    }
                })
                // step 3 - choose winner
                const winnerTx = await vrfContract.fulfillRandomWords(
                    requestId,
                    lotteryContract.address
                )
                await winnerTx.wait(1)

                console.log(
                    "Start time after lottery closed:",
                    ethers.utils.formatUnits(startLotteryTime, "wei")
                )
                console.log(
                    "End time after lottery closed:",
                    ethers.utils.formatUnits(endLotteryTime, "wei")
                )
            })
        }
    }
}

announceWinner()
    .then(() => {
        console.log("lottery duration successfully changed")
        process.exit(0)
    })
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
