import { ethers, network, getNamedAccounts } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { SmartLottery0Kage, VRFCoordinatorV2Mock } from "../typechain-types"
import { WinnerAnnouncedEvent } from "../typechain-types/contracts/SmartLottery"
import { shiftTimeTo } from "../utils/shiftTime"
import { announceWinner } from "./announceWinner"
import { enterLottery } from "./enterLottery"
import { makeTransfers } from "./makeTransfers"
import { protocolParams } from "./protocolParams"

const fullWalkthrough = async () => {
    // -> make 0Kage transfers to accounts 1 and 3
    await makeTransfers()

    // -> enter lottery for player 1/2/3
    await enterLottery()

    //-> generate protocol params before closing lottery
    await protocolParams()

    // -> shift time, close lottery and announce winner
    await announceWinner()

    // -> generate protocol params after closing lottery
    await protocolParams()
}

fullWalkthrough()
    .then(() => {
        console.log("lottery duration successfully changed")
        process.exit(0)
    })
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
