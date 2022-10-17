import { HardhatRuntimeEnvironment } from "hardhat/types"
import { developmentChains } from "../../helper-hardhat-config"
import { ethers, deployments, network } from "hardhat"

import { SmartLottery, VRFCoordinatorV2Mock } from "../../typechain-types"
import { WinnerAnnouncedEvent } from "../../typechain-types/contracts/SmartLottery"
import { shiftTimeTo } from "../../utils/shiftTime"
import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

/**
 * @notice One end-to-end integrated test that tests one entire epoch
 * @notice to run this integration test - we need 3 address on goerli, owner, player 1 and player 2
 * @notice 2 players enter lottery -> choose winner -> winner withdraws funds -> platform withdraws fees
 * @notice -> next epoch begins. One full cycle is tested here
 */

// FILL THE ADDRESSES HERE and HAVE PRIVATE KEYS in .env folder for the 3 addresses below
const OWNER_ADDRESS_GOERLI = ""
const PLAYER1_ADDRESS_GOERLI = ""
const PLAYER2_ADDRESS_GOERLI = ""

console.log("network name", network.name)
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery integration test", () => {
          let platformAdmin: SignerWithAddress
          let player1: SignerWithAddress
          let player2: SignerWithAddress

          beforeEach(async () => {
              console.log("Executing before each...")
              const accounts = await ethers.getSigners()
              // Step 0 : Get all players
              platformAdmin = accounts[0]
              player1 = accounts[1]
              player2 = accounts[2]
          })

          it("full end-to-end lottery integration test", async () => {
              console.log("starting end-to-end testing")
              console.log("admin address - goerli", platformAdmin.address)
              console.log("player1 address - goerli", player1.address)
              console.log("player2 address - goerli", player2.address)

              //   // Step 3: All players enter lottery with 0.1 ETH each
              //   const player1EnterTx = await lotteryContract
              //       .connect(player1)
              //       .enterLottery(1, { value: ethers.utils.parseEther("0.1") })
              //   await player1EnterTx.wait(1)
              //   const player2EnterTx = await lotteryContract
              //       .connect(player2)
              //       .enterLottery(2, { value: ethers.utils.parseEther("0.2") })
              //   await player2EnterTx.wait(1)
              //   //   const player3EnterTx = await lotteryContract
              //   //       .connect(player3)
              //   //       .enterLottery(3, { value: ethers.utils.parseEther("0.3") })
              //   //   await player3EnterTx.wait(1)
              //   // Step 4 - do a balances check at this point
              //   // Step 5 - push time beyond end time to enforce lottery stop
              //   const endTime = await lotteryContract.getEndTime()
              //   await shiftTimeTo(endTime.add(1))
              //   // Step 6: Now call checkUpkeep to generate a request Id.
              //   // Since time > endTime, upkeep returns true
              //   await lotteryContract.checkUpkeep("")
              //   // Step 5: Now we mimic a chainlink keeper and perform upkeep
              //   // And listen to Winner announced event
              //   // Once winner announced, we check who winner is and if winner balance is properly handled
              //   await new Promise(async (resolve, reject) => {
              //       try {
              //           lotteryContract.once("WinnerAnnounced", async () => {
              //               const winnerAnnouncedFilter =
              //                   lotteryContract.filters.WinnerAnnounced()
              //               const winnerEvent: WinnerAnnouncedEvent[] =
              //                   await lotteryContract.queryFilter(winnerAnnouncedFilter)
              //               const { winner, reward, fee } = winnerEvent[0].args
              //               const winnerIndex = accounts.findIndex(
              //                   (account) => account.address == winner
              //               )
              //               // first test - winnerIndex should be either 1/2/3
              //               // this is because players 1 (index 1), player 2 (index 2), player 3 (index 3) played
              //               assert(
              //                   winnerIndex > 0 && winnerIndex < 4,
              //                   "Winner has to be one of the accounts"
              //               )
              //               assert(
              //                   ethers.utils.formatEther(fee) == "0.003",
              //                   "0.003 ETH should be fee earned by platform"
              //               )
              //               //const winnerPayable = await lotteryContract.getUnclaimedBalance()
              //               //                              assert((await lotteryContract.getLotteryValue()) == )
              //               resolve("")
              //           })
              //       } catch (e) {
              //           console.log(e)
              //           reject()
              //       }
              //       const upkeepTx = await lotteryContract.performUpkeep("")
              //       const upkeepReceipt = await upkeepTx.wait(1)
              //       const requestId = upkeepReceipt.events![1].args!.requestId
              //       const randomTx = await vrfMockCoordinatorContract.fulfillRandomWords(
              //           requestId,
              //           lotteryContract.address
              //       )
              //       await randomTx.wait(1)
              //   })
          })
      })
