import { deployments, network, ethers, getNamedAccounts } from "hardhat"
import { networkConfig, developmentChains } from "../../helper-hardhat-config"
import { mine, time } from "@nomicfoundation/hardhat-network-helpers"
import { expect, assert } from "chai"
import { SmartLottery, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery unit tests", () => {
          let vrfCoordinatorContract: VRFCoordinatorV2Mock
          let lotteryContract: SmartLottery

          beforeEach(async () => {
              const { deployer } = await getNamedAccounts()
              // deploy all contracts for testing
              await deployments.fixture(["main"])

              vrfCoordinatorContract = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              lotteryContract = await ethers.getContract("SmartLottery", deployer)
          })

          describe("Constructor test", () => {
              it("vrf contract address initialization", async () => {
                  const vrfContractAddress = await lotteryContract.getVRFContract()
                  expect(vrfContractAddress).equals(
                      vrfCoordinatorContract.address,
                      "VRF Coordinator Mock address should match "
                  )
              })

              it("max players", async () => {
                  const maxPlayers = await lotteryContract.getMaxPlayers()
                  const max64 = 2 ** 64 - 1
                  expect(maxPlayers.toString().substring(0, 16)).equals(
                      max64.toString().substring(0, 16),
                      "max players on initialization should be 2^64-1"
                  )
              })
              it("platform fees", async () => {
                  const platformFee = await lotteryContract.getPlatformFee()
                  expect(platformFee.toString()).equals(
                      "50",
                      "platform fees should be 50 bps at initiation"
                  )
              })
              it("initial duration", async () => {
                  const duration = await lotteryContract.getDuration()
                  expect(duration.toString()).equals("24", "duration at initiation is 24 hours")
              })

              it("initial lottery fee", async () => {
                  const lotteryFee = await lotteryContract.getLotteryFee()
                  expect(lotteryFee.toString()).equals(
                      ethers.utils.parseEther("0.1").toString(),
                      "initial fee of 0.1 ether"
                  )
              })
          })

          describe("start and stop lottery", () => {
              it("Only owner can start lottery", async () => {
                  const accounts = await ethers.getSigners()
                  const impostor = accounts[1]

                  await expect(lotteryContract.connect(impostor).startLottery()).revertedWith(
                      "Only owner has access!"
                  )
              })
              it("Only owner can stop lottery", async () => {
                  const accounts = await ethers.getSigners()
                  const impostor = accounts[1]

                  await expect(lotteryContract.connect(impostor).stopLottery()).revertedWith(
                      "Only owner has access!"
                  )
              })
          })

          /**
           * @dev test checks if 1. only owner can execute 2. new owner is updated
           */
          describe("transfer ownership", () => {
              it("Check if only owner can transfer ownership", async () => {
                  const accounts = await ethers.getSigners()
                  const impostor = accounts[1]
                  await expect(
                      lotteryContract.connect(impostor).transferOwnership(impostor.address)
                  ).to.be.revertedWith("Only owner has access!")
              })

              it("Check if new owner is updated", async () => {
                  const { deployer } = await getNamedAccounts()
                  const accounts = await ethers.getSigners()
                  const newOwner = accounts[1]

                  await lotteryContract.transferOwnership(newOwner.address)
                  const output = await lotteryContract.getContractOwner()
                  expect(output).equals(newOwner.address, "Ownwership should be transferred")
              })
          })

          // duration change tests,
          // 1. only owner can do,
          // 2. change only allowed if status is closed
          // 3. check if duration is updated once change is done
          describe("change duration", () => {
              it("Check if only owner can change duration", async () => {
                  const accounts = await ethers.getSigners()
                  const impostor = accounts[1]
                  await expect(
                      lotteryContract.connect(impostor).changeDuration(10)
                  ).to.be.revertedWith("Only owner has access!")
              })

              it("Duration only changeable when lottery status is closed", async () => {
                  // at this stage, lottery is open (set to open in constructor)
                  // this has to fail when lottery is
                  await expect(lotteryContract.changeDuration(10)).to.be.revertedWith(
                      "Lottery should be closed!"
                  )
              })

              it("Duration should be updated", async () => {
                  await lotteryContract.stopLottery()
                  await lotteryContract.changeDuration(10)

                  expect(await lotteryContract.getDuration()).to.equal(
                      10,
                      "lottery duration should update to 10 hours"
                  )
              })
          })

          // fee change tests,
          // 1. only owner can do,
          // 2. change only allowed if status is closed
          // 3. check if duration is updated once change is done

          describe("change fee", () => {
              it("Check if only owner can change fee", async () => {
                  const accounts = await ethers.getSigners()
                  const impostor = accounts[1]
                  await expect(lotteryContract.connect(impostor).changeFee(100)).to.be.revertedWith(
                      "Only owner has access!"
                  )
              })

              it("Fee only changeable when lottery status is closed", async () => {
                  // at this stage, lottery is open (set to open in constructor)
                  // this has to fail when lottery is
                  await expect(lotteryContract.changeFee(100)).to.be.revertedWith(
                      "Lottery should be closed!"
                  )
              })

              it("Fee should be updated", async () => {
                  await lotteryContract.stopLottery()
                  await lotteryContract.changeFee(100)

                  expect(await lotteryContract.getPlatformFee()).to.equal(
                      100,
                      "lottery fee should update to 100 bps"
                  )
              })
          })

          // max player change tests,
          // 1. only owner can do,
          // 2. change only allowed if status is closed
          // 3. check if max players is updated once change is done
          describe("change max players", () => {
              it("Check if only owner can change max players", async () => {
                  const accounts = await ethers.getSigners()
                  const impostor = accounts[1]
                  await expect(
                      lotteryContract.connect(impostor).changeMaxPlayers(200)
                  ).to.be.revertedWith("Only owner has access!")
              })

              it("Max players only changeable when lottery status is closed", async () => {
                  // at this stage, lottery is open (set to open in constructor)
                  // this has to fail when lottery is
                  await expect(lotteryContract.changeMaxPlayers(200)).to.be.revertedWith(
                      "Lottery should be closed!"
                  )
              })

              it("Max players should be updated", async () => {
                  await lotteryContract.stopLottery()
                  await lotteryContract.changeMaxPlayers(200)

                  expect(await lotteryContract.getMaxPlayers()).to.equal(
                      100,
                      "lottery max players should update to 200"
                  )
              })
          })

          // max tickets per player change tests,
          // 1. only owner can do,
          // 2. change only allowed if status is closed
          // 3. check if max tickets per players is updated once change is done
          describe("change max tickets per player", () => {
              it("Check if only owner can change max players", async () => {
                  const accounts = await ethers.getSigners()
                  const impostor = accounts[1]
                  await expect(
                      lotteryContract.connect(impostor).changeMaxTicketsPerPlayer(10)
                  ).to.be.revertedWith("Only owner has access!")
              })

              it("Max tickets per player only changeable when lottery status is closed", async () => {
                  // at this stage, lottery is open (set to open in constructor)
                  // this has to fail when lottery is
                  await expect(lotteryContract.changeMaxTicketsPerPlayer(10)).to.be.revertedWith(
                      "Lottery should be closed!"
                  )
              })

              it("Max tickets per player should be updated", async () => {
                  await lotteryContract.stopLottery()
                  await lotteryContract.changeMaxTicketsPerPlayer(10)

                  expect(await lotteryContract.getMaxTicketsPerPlayer()).to.equal(
                      10,
                      "lottery max players should update to 10"
                  )
              })
          })

          // enter only  if num tickets atleast 1
          // enter only if existing players < num players
          // enter only if existing tickets per holder < max tickets
          // enter only if lottery fees is consistent with num tickets
          // check if all storage variables, mappings, platform fees and total value properly updated
          describe("enter lottery", () => {
              it("Number of tickets should atleast be 1", async () => {
                  await expect(lotteryContract.enterLottery(0)).to.revertedWithCustomError(
                      lotteryContract,
                      "SmartLottery_BelowMinimumPurchase"
                  )
              })

              it("Players should always be less than max players", async () => {
                  const accounts = await ethers.getSigners()
                  const player1 = accounts[1]
                  const player2 = accounts[2]

                  // set max players to 1
                  await lotteryContract.stopLottery()
                  await lotteryContract.changeMaxPlayers(1)
                  await lotteryContract.startLottery()

                  // first player enters lottery
                  await lotteryContract
                      .connect(player1)
                      .enterLottery(1, { value: ethers.utils.parseEther("0.1") })

                  // second player tries to enter
                  await expect(
                      lotteryContract
                          .connect(player2)
                          .enterLottery(1, { value: ethers.utils.parseEther("0.1") })
                  )
                      .to.revertedWithCustomError(lotteryContract, "SmartLottery__MaxPlayerLimit")
                      .withArgs(1)
              })

              it("Current Player should not exceed ticket limit per player - scenario 1", async () => {
                  const player1 = (await ethers.getSigners())[1]
                  // set max tickets per player equal to 1
                  await lotteryContract.stopLottery()
                  await lotteryContract.changeMaxTicketsPerPlayer(1)
                  await lotteryContract.startLottery()

                  // player 1 buys 2 tickets
                  await expect(
                      lotteryContract
                          .connect(player1)
                          .enterLottery(2, { value: ethers.utils.parseEther("0.2") })
                  )
                      .to.be.revertedWithCustomError(
                          lotteryContract,
                          "SmartLottery__MaxTicketLimit"
                      )
                      .withArgs(0, 1)
              })

              it("Current Player should not exceed ticket limit per player - scenario 2", async () => {
                  const player1 = (await ethers.getSigners())[1]
                  // set max tickets per player equal to 1
                  await lotteryContract.stopLottery()
                  await lotteryContract.changeMaxTicketsPerPlayer(1)
                  await lotteryContract.startLottery()

                  // player 1 buys 1 ticket first time
                  await lotteryContract
                      .connect(player1)
                      .enterLottery(1, { value: ethers.utils.parseEther("0.1") })

                  // player 1 comes back again to buy 1 mmore ticket
                  // second ticket purchase should fail

                  await expect(
                      lotteryContract
                          .connect(player1)
                          .enterLottery(1, { value: ethers.utils.parseEther("0.1") })
                  )
                      .to.be.revertedWithCustomError(
                          lotteryContract,
                          "SmartLottery__MaxTicketLimit"
                      )
                      .withArgs(1, 1)
              })

              it("Player should send the correct fees to participate", async () => {
                  const player1 = (await ethers.getSigners())[1]

                  const expectedFee = ethers.utils.parseEther("0.1")
                  const actualFee = ethers.utils.parseEther("0.01")

                  await expect(
                      lotteryContract.connect(player1).enterLottery(1, { value: actualFee })
                  )
                      .to.be.revertedWithCustomError(
                          lotteryContract,
                          "SmartLottery__InsufficientFunds"
                      )
                      .withArgs(actualFee, expectedFee)
              })
              it("On lottery entry, all storage variables need to update", async () => {
                  const accounts = await ethers.getSigners()

                  const player1 = accounts[1]
                  const player2 = accounts[2]

                  // player 1 buys 2 tickets
                  await lotteryContract
                      .connect(player1)
                      .enterLottery(2, { value: ethers.utils.parseEther("0.2") })

                  // player 2 buys 1 ticket

                  await lotteryContract
                      .connect(player2)
                      .enterLottery(1, { value: ethers.utils.parseEther("0.1") })

                  // check if num players is updated
                  expect(await lotteryContract.getPlayers()).equals(2, "2 players in the game")

                  // check if ticket counter is updated
                  expect(await lotteryContract.getTotalTicketsIssued()).equals(
                      3,
                      "3 tickets issued"
                  )

                  // check if total lottery value is updated
                  expect(await lotteryContract.getLotteryValue()).equals(
                      ethers.utils.parseEther("0.3"),
                      "lottery value is 0.3 ethers"
                  )

                  // check if owner of ticket id 0, 1 is player1, owner of ticket id 2 is player 2
                  expect(await lotteryContract.getOwnerForTicketId(1)).equals(
                      player1.address,
                      "Owner of ticket 0 is player 1"
                  )
                  expect(await lotteryContract.getOwnerForTicketId(1)).equals(
                      player1.address,
                      "Owner of ticket 1 is player 1"
                  )
                  expect(await lotteryContract.getOwnerForTicketId(2)).equals(
                      player2.address,
                      "Owner of ticket 0 is player 2"
                  )

                  // check if platform fee payable is updated
                  expect(await lotteryContract.getCumulativePlatformBalance()).equals(
                      ethers.utils.parseEther("0.0015"),
                      "platform fees should be 0.3 ethers * 0.5% = 0.0015"
                  )

                  // check if num tickets counter is updated for the player
                  expect(await lotteryContract.connect(player1).getNumTickets()).equals(
                      2,
                      "2 tickets for player 1"
                  )
                  expect(await lotteryContract.connect(player2).getNumTickets()).equals(
                      1,
                      "1 ticket for player 2"
                  )
              })
          })

          // check if upkeep needed
          // false if time < lottery end time & lottery status is open
          // false if time > lottery end time & lottery status is closed

          describe("check upkeep", () => {
              it("no upkeep needed until lottery end", async () => {
                  const lotteryEndTime = await lotteryContract.getEndTime()

                  // move close but stay below the lottery end time
                  // time in hardhat helper allows us to go to a specific time stamp
                  await time.increaseTo(lotteryEndTime.sub(100))
                  const [upkeepNeededBeforeEnd] = await lotteryContract.checkUpkeep("0x")
                  expect(upkeepNeededBeforeEnd).equals(
                      false,
                      "No upkeep needed until lottery end time"
                  )
              })

              it("upkeep needed after lottery end and status is open", async () => {
                  const lotteryEndTime = await lotteryContract.getEndTime()

                  await time.increaseTo(lotteryEndTime.add(100))
                  const [upkeepNeededAfterEnd] = await lotteryContract.checkUpkeep("0x")
                  expect(upkeepNeededAfterEnd).equals(true, "upkeep needed after lottery end time")
              })

              it("no upkeep needed after lottery end if status is closed", async () => {
                  const lotteryEndTime = await lotteryContract.getEndTime()

                  //stop lottery
                  await lotteryContract.stopLottery()

                  await time.increaseTo(lotteryEndTime.add(100))
                  const [upkeepNeededAfterEnd] = await lotteryContract.checkUpkeep("0x")
                  expect(upkeepNeededAfterEnd).equals(
                      false,
                      "if lottery closed, upkeep not needed even after lottery end time"
                  )
              })
          })

          describe("perform upkeep", () => {
              it("check if lottery status is closed", async () => {
                  // push time forward so that checkupkeep is true
                  const lotteryEndTime = await lotteryContract.getEndTime()
                  await time.increaseTo(lotteryEndTime.add(100))

                  //perform upkeep manually - since we are testing
                  // in real life, this will be automatically done by chainlink keepers
                  await lotteryContract.performUpkeep("0x")
                  expect(await lotteryContract.getStatus()).equals(
                      1,
                      "Lottery status must be closed on perform upkeep"
                  )
              })

              it("check request id for random numbers", async () => {
                  // push time forward so that checkupkeep is true
                  const lotteryEndTime = await lotteryContract.getEndTime()
                  await time.increaseTo(lotteryEndTime.add(100))

                  //perform upkeep manually - since we are testing
                  // in real life, this will be automatically done by chainlink keepers
                  await expect(lotteryContract.performUpkeep("0x"))
                      .to.emit(lotteryContract, "CloseLottery")
                      .withArgs(() => true)
              })

              it("withdraw platform fees", () => {})

              it("set lottery start and end times", () => {})
          })
      })
