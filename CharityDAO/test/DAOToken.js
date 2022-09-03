const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("CharityDAO", function () {
  async function deployDAO() {

    const price = "500000000000000000"

    // Contracts are deployed using the first signer/account by default
    const [owner, acc1, acc2, acc3, receiver] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory("CharityDAO");
    const contract = await Contract.deploy();

    return { contract, price, owner, acc1, acc2, acc3, receiver};
  }

  describe("Initially", function () {
    it("It should update contractAddress variable", async function () {
      const { contract } = await loadFixture(deployDAO);

      expect(await contract.cometAddress()).to.not.equal(null);
    });

    it("It should set price as 0.5 ether", async function () {
      const { contract, price, owner, receiver } = await loadFixture(deployDAO);

      expect(await contract.price()).to.equal(price);
    });
  });

  describe("Mint", function () {
    it("It should charge buyer 0.5 ether for each token other wise revert", async function () {
      const { contract, price, acc1} = await loadFixture(deployDAO);


      await expect(contract.connect(acc1).mint(2, {value: price})).to.be.revertedWith(
        "wrong amount"
      );
    });

    it("It should transfer tokens to the buyer", async function () {
      const { contract, price, acc1 } = await loadFixture(
        deployDAO
      );

      // const CometContract = await ethers.getContractFactory("CharityDAO");
      // const cometContract = await CometContract.deploy(contract);

      await contract.connect(acc1).mint(1, {value: price})
      expect(await contract.balanceOf(acc1.address)).to.equal(1)
    });
  });

  describe("Send Proposal", function () {
    it("It should revert if the proposal is invoked by an unregistered address", async function () {
      const { contract, price, acc3, receiver} = await loadFixture(
        deployDAO
      );

      await expect(contract.connect(acc3).sendProposal("flood", price, receiver.address)).to.be.revertedWith(
        "user is ineliglible"
      )   
    });

    it("It should save the proposal in the mapping", async function () {
      const { contract, price, owner, receiver} = await loadFixture(
        deployDAO
      );

      await contract.mint(1, {value: price})
      await contract.sendProposal("flood", price, receiver.address)

      expect(await contract.viewProposal(0))
        .to.equal.toString("tuple(uint256,address,address,uint256,uint256,bool): 0,0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,0,500000000000000000,true"); 
    });

    it("Should emit an event", async function () {
      const { contract, price, owner, receiver} = await loadFixture(
        deployDAO
      );

      await contract.mint(1, {value: price})

      await expect(contract.sendProposal("flood", price, receiver.address))
        .to.emit(contract, "declareProposal")
        .withArgs(0, "flood", owner.address, price, receiver.address);
    });
  });

  describe("Vote", function () {
    it("It should revert if the proposal is not active", async function () {
      const { contract} = await loadFixture(
        deployDAO
      );

      await expect(contract.vote(0)).to.be.revertedWith(
        "proposal not active anymore"
      )   
    });

    it("It should revert if the proposal is invoked by an unregistered address", async function () {
      const { contract, price, acc3, receiver} = await loadFixture(
        deployDAO
      );
      
      await contract.mint(1, {value: price})
      await contract.sendProposal("flood", price, receiver.address)

      await expect(contract.connect(acc3).vote(0)).to.be.revertedWith(
        "user ineliglible to vote"
      )   
    });

    it("It should revert if address has already voted", async function () {
      const { contract, price, acc3, receiver} = await loadFixture(
        deployDAO
      );

      await contract.mint(1, {value: price})
      await contract.connect(acc3).mint(1, {value: price})
      await contract.sendProposal("flood", price, receiver.address)
      await contract.connect(acc3).vote(0)

      await expect(contract.connect(acc3).vote(0)).to.be.revertedWith(
        "you have already voted"
      )   
    });

    it("It should add votes eqaul to the amount of tokens an address has (3 tokens = 3 votes)", async function () {
      const { contract, price, acc3, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc3).mint(2, {value: "1000000000000000000"})
      await contract.mint(1, {value: price})
      await contract.sendProposal("flood", price, receiver.address)
      await contract.connect(acc3).vote(0)

      expect(await contract.viewProposal(0))
        .to.equal.toString("tuple(uint256,address,address,uint256,uint256,bool): 0,0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,3,500000000000000000,true");  
    });
  });

  describe("Veto", function () {
    it("It should revert if the proposal is not active", async function () {
      const { contract} = await loadFixture(
        deployDAO
      );

      await expect(contract.veto(0)).to.be.revertedWith(
        "proposal not active anymore"
      )   
    });

    it("It should revert if the proposal is invoked by an unregistered address", async function () {
      const { contract, price, acc3, receiver} = await loadFixture(
        deployDAO
      );

      await contract.mint(1, {value: price})
      await contract.sendProposal("flood", price, receiver.address)

      await expect(contract.connect(acc3).veto(0)).to.be.revertedWith(
        "user ineliglible to vote"
      )   
    });

    it("It should revert if address has not already voted", async function () {
      const { contract, price, acc3, receiver} = await loadFixture(
        deployDAO
      );

      await contract.mint(1, {value: price})
      await contract.connect(acc3).mint(1, {value: price})
      await contract.sendProposal("flood", price, receiver.address)

      await expect(contract.connect(acc3).veto(0)).to.be.revertedWith(
        "you have not voted"
      )   
    });

    it("It should subract votes eqaul to the amount of tokens an address has (3 tokens = 3 votes)", async function () {
      const { contract, price, acc3, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc3).mint(2, {value: "1000000000000000000"})
      await contract.mint(1, {value: price})
      await contract.sendProposal("flood", price, receiver.address)
      await contract.connect(acc3).vote(0)
      await contract.connect(acc3).veto(0)

      expect(await contract.viewProposal(0))
        .to.equal.toString("tuple(uint256,address,address,uint256,uint256,bool): 0,0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,0,500000000000000000,true");  
    });
  });

  describe("End Proposal -- with fund withdrawals", function () {
    it("It should revert if the proposal is not active", async function () {
      const { contract} = await loadFixture(
        deployDAO
      );

      // await contract.sendProposal("flood", price, receiver.address)

      await expect(contract.endProposal(0)).to.be.revertedWith(
        "proposal already ended"
      )   
    });

    it("It should revert if the function is invoked by an address other than the creator's", async function () {
      const { contract, price,acc1, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc1).mint(1, {value: price})
      await contract.connect(acc1).sendProposal("flood", price, receiver.address)      

      await expect(contract.endProposal(0)).to.be.revertedWith(
        "user is ineliglible"
      )   
    });

    it("It should de-activate the proposal", async function () {
      const { contract, price, acc1, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc1).mint(3, {value: "1500000000000000000"})
      await contract.connect(acc1).sendProposal("flood", price, receiver.address)  
      await contract.connect(acc1).endProposal(0)  

      await expect(contract.connect(acc1).endProposal(0)).to.be.revertedWith(
        "proposal already ended"
      )   
    });

    it("It should transfer proposed funds if voter% >= 50% and emit and event", async function () {
      const { contract, price, acc1,acc2,acc3, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc1).mint(3, {value: "1500000000000000000"})
      await contract.connect(acc2).mint(1, {value: price})
      await contract.connect(acc3).mint(1, {value: price})
      await contract.connect(acc1).sendProposal("flood", price, receiver.address)
      await contract.connect(acc1).vote(0)
      await contract.connect(acc2).vote(0)
      await contract.connect(acc3).vote(0)

      await expect(contract.connect(acc1).endProposal(0))
        .to.emit(contract, "transfer")
        .withArgs(receiver.address, "0x");

      expect(await receiver.getBalance()).to.equal("10000500000000000000000")
      
    });

    it("It should not transfer proposed funds if voter% < 50%", async function () {
      const { contract, price, acc1,acc2,acc3, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc1).mint(1, {value: price})
      await contract.connect(acc2).mint(1, {value: price})
      await contract.connect(acc3).mint(1, {value: price})
      await contract.connect(acc1).sendProposal("flood", price, receiver.address)
      await contract.connect(acc1).vote(0)
      await contract.connect(acc1).endProposal(0)  

      expect(await receiver.getBalance()).to.equal("10000000000000000000000")
    });
  });

  describe("Withdraw Proposal -- without fund withdrawals", function () {
    it("It should revert if the proposal is not active", async function () {
      const { contract} = await loadFixture(
        deployDAO
      );

      // await contract.sendProposal("flood", price, receiver.address)

      await expect(contract.withdrawProposal(0)).to.be.revertedWith(
        "proposal already ended"
      )   
    });

    it("It should revert if the function is invoked by an address other than the creator's", async function () {
      const { contract, price,acc1, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc1).mint(1, {value: price})
      await contract.connect(acc1).sendProposal("flood", price, receiver.address)      

      await expect(contract.withdrawProposal(0)).to.be.revertedWith(
        "user is ineliglible"
      )   
    });

    it("It should de-activate the proposal", async function () {
      const { contract, price, acc1, receiver} = await loadFixture(
        deployDAO
      );

      await contract.connect(acc1).mint(3, {value: "1500000000000000000"})
      await contract.connect(acc1).sendProposal("flood", price, receiver.address)  
      await contract.connect(acc1).withdrawProposal(0)  

      await expect(contract.connect(acc1).withdrawProposal(0)).to.be.revertedWith(
        "proposal already ended"
      )   
    });
  });
});
