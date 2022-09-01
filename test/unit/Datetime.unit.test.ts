import { deployments, network, ethers, getNamedAccounts } from "hardhat"
import { networkConfig, developmentChains } from "../../helper-hardhat-config"
import { expect, assert } from "chai"
import { DateTime } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Datetime tests", () => {
          let dateContract: DateTime

          beforeEach(async () => {
              const { deployer } = await getNamedAccounts()
              await deployments.fixture(["datetime"])

              dateContract = await ethers.getContract("DateTime", deployer)
          })

          describe("Get date functions test", () => {
              it("Get Year", async () => {
                  const randomDate = Date.UTC(2012, 12, 1) //01-01-2012
                  const year = await dateContract.getYear(randomDate / 1000)

                  expect(year.toString()).equals("2012", "year is 2012")
              })

              it("Get Month", async () => {
                  const randomDate = Date.UTC(2012, 12, 1)
                  const month = await dateContract.getMonth(randomDate / 1000)

                  expect(month.toString()).equals("12", "month is Dec")
              })

              it("Get Day", async () => {
                  const randomDate: number = Date.UTC(2012, 12, 5)
                  const day = await dateContract.getDay(randomDate / 1000)

                  expect(day.toString()).equals("5", "day is 5th")
              })

              it("Get Hour", async () => {
                  const randomDate = Date.UTC(2012, 11, 13, 21, 39, 45)
                  const hour = await dateContract.getHour(randomDate / 1000)

                  expect(hour.toString()).equals("21", "hour should be 21:00")
              })

              it("Get Minute", async () => {
                  const randomDate = Date.UTC(2012, 11, 13, 21, 39, 45)
                  const min = await dateContract.getMinute(randomDate / 1000)

                  expect(min.toString()).equals("39", "min should be 39")
              })

              it("Get Second", async () => {
                  const randomDate = Date.UTC(2012, 11, 13, 21, 39, 45)
                  const sec = await dateContract.getSecond(randomDate / 1000)

                  expect(sec.toString()).equals("45", "sec should be 45")
              })

              it("Get Days in Month", async () => {
                  const daysLeapYr = await dateContract.getDaysInMonth(2, 2016)
                  const daysNonLeapYr = await dateContract.getDaysInMonth(2, 2017)
                  expect(daysLeapYr.toString()).equals("29", "days in Feb 2016 are 29, leap year")
                  expect(daysNonLeapYr.toString()).equals(
                      "28",
                      "days in Feb 2017 are 28, non leap year"
                  )
              })
          })

          describe("Date to Timestamp functions", async () => {
              it("Year Month Day", async () => {
                  // Note: Month in this case is a number between 0 & 11
                  // So Novemner is 10
                  const randomDate = Date.UTC(2021, 10, 29) / 1000

                  // In dateContract, Nov is treated as 11
                  const randomTimestamp = await dateContract["toTimestamp(uint16,uint8,uint8)"](
                      2021,
                      11,
                      29
                  )
                  expect(randomTimestamp.toString()).equals(
                      randomDate.toString(),
                      "timestamp should match js timestamp for 29 Nov 2021"
                  )
              })

              it("Year Month Day Hour", async () => {
                  const randomDate = Date.UTC(2021, 10, 29, 23) / 1000

                  const randomTimestamp = await dateContract[
                      "toTimestamp(uint16,uint8,uint8,uint8)"
                  ](2021, 11, 29, 23)

                  expect(randomTimestamp.toString()).equals(
                      randomDate.toString(),
                      "timestamp should match js timestamp for 29 Nov 2021 23:00 hrs"
                  )
              })

              it("Year Month Day Hour Minute", async () => {
                  const randomDate = Date.UTC(2021, 10, 29, 23, 39) / 1000

                  const randomTimestamp = await dateContract[
                      "toTimestamp(uint16,uint8,uint8,uint8,uint8)"
                  ](2021, 11, 29, 23, 39)

                  expect(randomTimestamp.toString()).equals(
                      randomDate.toString(),
                      "timestamp should match js timestamp for 29 Nov 2021 23:39"
                  )
              })

              it("Year Month Day Hour Minute Second", async () => {
                  const randomDate = Date.UTC(2021, 10, 29, 23, 39, 45) / 1000

                  const randomTimestamp = await dateContract[
                      "toTimestamp(uint16,uint8,uint8,uint8,uint8,uint8)"
                  ](2021, 11, 29, 23, 39, 45)

                  expect(randomTimestamp.toString()).equals(
                      randomDate.toString(),
                      "timestamp should match js timestamp for 29 Nov 2021 23:39:45"
                  )
              })
          })
      })
