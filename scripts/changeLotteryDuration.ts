import { ethers, network, getNamedAccounts } from "hardhat"
import { SmartLottery0Kage } from "../typechain-types"

const changeLotteryDuration = async (duration: number) => {
    const { deployer } = await getNamedAccounts()
    const lotteryContract: SmartLottery0Kage = await ethers.getContract(
        "SmartLottery0Kage",
        deployer
    )

    // stop lottery first

    const stopTx = await lotteryContract.stopLottery()
    const stopReceipt = await stopTx.wait(1)
    console.log("stop receipt", stopReceipt)

    const oldDuration = await lotteryContract.getDuration()
    console.log(`Old duration is: ${oldDuration}`)

    const changeDurationTx = await lotteryContract.changeDuration(duration)
    await changeDurationTx.wait(1)

    const revisedDuration = await lotteryContract.getDuration()
    console.log(`Revised duration is: ${revisedDuration}`)

    const endDate = await lotteryContract.getEndTime()

    console.log(
        "End date time",
        new Date(parseInt(ethers.utils.formatUnits(endDate, "wei")) * 1000)
    )

    const startTx = await lotteryContract.startLottery()
    await startTx.wait(1)
}

changeLotteryDuration(160)
    .then(() => {
        console.log("lottery duration successfully changed")
        process.exit(0)
    })
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
