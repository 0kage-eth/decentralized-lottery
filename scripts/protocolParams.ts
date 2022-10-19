import { ethers, network, getNamedAccounts } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { SmartLottery0Kage, VRFCoordinatorV2Mock } from "../typechain-types"
import { WinnerAnnouncedEvent } from "../typechain-types/contracts/SmartLottery"
import { shiftTimeTo } from "../utils/shiftTime"

// helper script that mocks winner selection
// used to check front end updates correctly
export const protocolParams = async () => {
    console.log("************* generating protocol params *****************")
    const accounts = await ethers.getSigners()
    const lotteryContract: SmartLottery0Kage = await ethers.getContract(
        "SmartLottery0Kage",
        accounts[0].address
    )

    const currentEpoch = await lotteryContract.getEpoch()
    console.log("current epoch", currentEpoch)

    const numTickets = await lotteryContract.getTotalTicketsIssued()
    console.log("num tickets", ethers.utils.formatUnits(numTickets, "wei"))

    const potSize = await lotteryContract.getLotteryValue()
    console.log("pot size", ethers.utils.formatEther(potSize))

    const platformFee = await lotteryContract.getPlatformFee()
    console.log("platform fee", ethers.utils.formatEther(platformFee))

    const player1Tickets = await lotteryContract.connect(accounts[0]).getNumTickets()
    console.log("player 1 tickets", ethers.utils.formatUnits(player1Tickets, "wei"))

    const player1Balance = await lotteryContract
        .connect(accounts[1])
        .getWinnerBalance(accounts[0].address)
    console.log("player 1 balance", ethers.utils.formatEther(player1Balance))

    const player2Tickets = await lotteryContract.connect(accounts[1]).getNumTickets()
    console.log("player 2 tickets", ethers.utils.formatUnits(player2Tickets, "wei"))

    const player2Balance = await lotteryContract.getWinnerBalance(accounts[1].address)
    console.log("player 2 balance", ethers.utils.formatEther(player2Balance))

    const player3Tickets = await lotteryContract.connect(accounts[3]).getNumTickets()
    console.log("player 3 tickets", ethers.utils.formatUnits(player3Tickets, "wei"))

    const player3Balance = await lotteryContract.getWinnerBalance(accounts[3].address)
    console.log("player 3 balance", ethers.utils.formatEther(player3Balance))
}

protocolParams()
    .then(() => {
        process.exit(0)
    })
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
