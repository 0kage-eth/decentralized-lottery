import { ethers, network, getNamedAccounts } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { ZeroKageMock } from "../typechain-types"

export const makeTransfers = async () => {
    console.log("************* making initial transfers *****************")
    if (developmentChains.includes(network.name)) {
        // works only on local network
        const { deployer } = await getNamedAccounts()
        const accounts = await ethers.getSigners()

        // accounts.map((account, index) => console.log(`addresss${index} - ${account.address}`))
        const player1 = accounts[1].address
        const player2 = accounts[3].address

        const zKageContract: ZeroKageMock = await ethers.getContract("ZeroKageMock", deployer)

        // stop lottery first

        const t1Tx = await zKageContract.transfer(player1, ethers.utils.parseEther("100")) // 100 0kage
        const t1Receipt = await t1Tx.wait(1)
        // console.log("transfer 1 receipt", t1Receipt)
        console.log("balance of player1", await zKageContract.balanceOf(player1))

        const t2Tx = await zKageContract.transfer(player2, ethers.utils.parseEther("100")) // 100 0Kage
        const t2Receipt = await t2Tx.wait(1)
        // console.log("transfer 2 receipt", t2Receipt)
        console.log("player 2 address", player2)
        console.log(
            "balance of player2",
            ethers.utils.formatEther(await zKageContract.balanceOf(player2))
        )
    }
}

makeTransfers()
    .then(() => {
        console.log("lottery duration successfully changed")
        process.exit(0)
    })
    .catch((e) => {
        console.log(e)
        process.exit(1)
    })
