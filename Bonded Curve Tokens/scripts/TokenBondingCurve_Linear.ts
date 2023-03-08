import { ethers } from "hardhat";

async function main() {

  // const lockedAmount = ethers.utils.parseEther("1");

  const Contract = await ethers.getContractFactory("TokenBondingCurve_Linear");
  const contract = await Contract.deploy("abc", "ABC", 3, 1000000000);

  const [owner, acc1, acc2] = await ethers.getSigners();

  await contract.deployed();

  console.log(`deployed to ${contract.address}`);

  console.log("\n***********************************************************************\n");

  let price = await contract.connect(acc1).calculatePriceForBuy(3);
  console.log("buying price of 3 tokens", price)
  await contract.connect(acc1).buy(3, {value: price});
  console.log(`balance of acc1: ${await contract.connect(acc1).balanceOf(acc1.address)}\ntotal supply: ${await contract.totalSupply()}`);
  console.log("acc1 buys 3 tokens");

  console.log("\n***********************************************************************\n");

  console.log("sell price of 2 tokens", await contract.connect(acc1).calculatePriceForSell(2))
  await contract.connect(acc1).sell(2);
  console.log(`balance of acc1: ${await contract.connect(acc1).balanceOf(acc1.address)}\ntotal supply: ${await contract.totalSupply()}`);
  console.log("acc1 sells 2 tokens");

  console.log("\n***********************************************************************\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
