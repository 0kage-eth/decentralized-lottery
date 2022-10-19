import { ethers, network, getNamedAccounts } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { SmartLottery0Kage, ZeroKageMock, VRFCoordinatorV2Mock } from "../typechain-types"
import { WinnerAnnouncedEvent } from "../typechain-types/contracts/SmartLottery"
import { shiftTimeTo } from "../utils/shiftTime"

export const enterLottery = async () => {
    console.log("************* entering lottery with 3 players *****************")
    const accounts = await ethers.getSigners()

    const player1 = accounts[0]
    const player2 = accounts[1]
    const player3 = accounts[3]

    const lotteryContract: SmartLottery0Kage = await ethers.getContract("SmartLottery0Kage")
    const zKageContract: ZeroKageMock = await ethers.getContract("ZeroKageMock")

    const approve1 = await zKageContract
        .connect(player1)
        .approve(lotteryContract.address, ethers.utils.parseEther("0.3"))
    await approve1.wait(1)

    const approve2 = await zKageContract
        .connect(player2)
        .approve(lotteryContract.address, ethers.utils.parseEther("0.2"))
    await approve2.wait(1)

    const approve3 = await zKageContract
        .connect(player3)
        .approve(lotteryContract.address, ethers.utils.parseEther("0.5"))
    await approve3.wait(1)

    const enterPlayer1 = await lotteryContract.connect(player1).enterLottery(3)
    await enterPlayer1.wait(1)

    const enterPlayer2 = await lotteryContract.connect(player2).enterLottery(2)
    await enterPlayer2.wait(1)

    const enterPlayer3 = await lotteryContract.connect(player3).enterLottery(5)
    await enterPlayer3.wait(1)
}

enterLottery()
    .then(() => {
        console.log("enter lottery")
        process.exit(0)
    })
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
