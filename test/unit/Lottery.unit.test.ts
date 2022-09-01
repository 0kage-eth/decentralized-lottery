import { deployments, network, ethers } from "hardhat"
import { networkConfig, developmentChains } from "../../helper-hardhat-config"
import { expect, assert } from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery unit tests", () => {
          beforeEach(async () => {})

          describe("Constructor test", () => {
              it("vrf contract address", async () => {})
          })

          describe("transfer ownership", () => {})

          describe("change duration", () => {})

          describe("change fee", () => {})

          describe("change max players", () => {})

          describe("withdraw platform fees", () => {})

          describe("check upkeep", () => {})

          describe("perform upkeep", () => {})

          describe("close lottery", () => {})

          describe("announce winner", () => {})

          describe("set lottery start and end times", () => {})
      })
