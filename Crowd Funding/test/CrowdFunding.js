// Right click on the script name and hit "Run" to execute
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");


describe("Crowd Funding", function () {
    describe("initially", function() {
        it("the initial balance of the contract should be zero", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(120, 100, 1000);
            console.log('cf deployed at:'+ cf.address)
            expect((await cf.balance(cf.address)).toNumber()).to.equal(0);
        });

        it("number of contributers should be zero", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(120, 100, 1000);
            expect((await cf.numberOfContributers())).to.equal(0);
        });
    
        it("before the deadline passes function should return false, once it passes it should return true", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            expect((await cf.hasDeadlinePassed())).to.equal(false);
            await time.increaseTo(await time.latest() + 20000);
            expect(await cf.hasDeadlinePassed()).to.equal(true);
        });
    })

    describe("contribute functioinality", function() {
        it("the contribution of a contributer must be sent to the contract", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(120, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 100});
            expect(await cf.balance(cf.address)).to.equal(100);
        })
        it("the contribution of an owner must be denied", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(120, 100, 1000);
            // const[owner] = await ethers.getSigners();
            await expect(cf.contribute({value: 100})).to.be.revertedWith("the manager cannot contribute");
        })
        it("contributions should close once deadline passes", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await time.increaseTo(await time.latest() + 20000);
            await expect(cf.connect(acc1).contribute({value: 100})).to.be.revertedWith("deadline has passed, contributions are closed");

        });
        it("contributions lower than minimum contribution should be denied", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await expect(cf.connect(acc1).contribute({value: 10})).to.be.revertedWith("contribution lower than minimum contribution");
        });
        it("it should increase the total number of contributers by one", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 100});
            expect (await cf.numberOfContributers()).to.equal(1);
        });
    }) 

    describe("see contribution", function() {
        it("displays the contribution of an address", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(120, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 100});
            expect(await cf.seeContribution(acc1.address)).to.equal(100);
        })
        it("displays the contribution of an owner as zero", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(120, 100, 1000);
            const[owner] = await ethers.getSigners();
            expect(await cf.seeContribution(owner.address)).to.equal(0);
        })
    })

    describe("recover contribution", function() {
        it("displays error if deadline has not passed yet", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(120, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await expect(cf.connect(acc1).recoverContribution()).to.be.revertedWith("deadline has not passed, contributions cannot be recovered rightnow");
        })
        it("displays error if target has been met and more than 3 contributors exist", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3, acc4] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await cf.connect(acc4).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await expect(cf.connect(acc1).recoverContribution()).to.be.revertedWith("target has been met, cannot recover contributions now or more than three contributors");
        })
        it("displays error there are more than 3 contributers", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3, acc4] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 200});
            await cf.connect(acc2).contribute({value: 800});
            await cf.connect(acc3).contribute({value: 200});
            await cf.connect(acc4).contribute({value: 200});

            await time.increaseTo(await time.latest() + 20000);
            await expect(cf.connect(acc1).recoverContribution()).to.be.revertedWith("target has been met, cannot recover contributions now or more than three contributors");
        })
        it("displays error if caller has not contributed anything", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await expect(cf.recoverContribution()).to.be.revertedWith("you have not contributed anything");
        })
        it("nullifies a user's contribution once they take it out", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.connect(acc1).recoverContribution();
            expect(await cf.seeContribution(acc1.address)).to.equal(0)
        })
        
    })

    describe("open poll", function() {
        it("throws error if owner tries to open more than one poll", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, owner.address);
            await expect(cf.openPoll("something2", 200, owner.address)).to.be.revertedWith("previous poll has not been closed yet")
        })
        it("throws error if anyone other than owner tries to open a poll", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1] = await ethers.getSigners();
            await time.increaseTo(await time.latest() + 20000);
            await expect(cf.connect(acc1).openPoll("something2", 200, owner.address)).to.be.revertedWith("Ownable: caller is not the owner")
        })
    })

    describe("withdraw amount / end poll", function() {
        it("throws error if owner tries to close a poll which does not exist", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            await time.increaseTo(await time.latest() + 20000);
            await expect(cf.withdrawAmount()).to.be.revertedWith("new poll has not been started")
        })
        it("throws error if anyone other than owner tries to close poll", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, owner.address);
            await expect(cf.connect(acc1).withdrawAmount()).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("if votes are lesser than 50% intended account does not recieves ether", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners();
            // console.log(await acc5.getBalance());
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, acc5.address);
            await cf.withdrawAmount();
            expect (await acc5.getBalance()).to.equal("10000000000000000000000")
        })
        it("if votes are greater than 50% intended account recieves ether", async function() {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners();
            // console.log(await acc5.getBalance());
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, acc5.address);
            await cf.connect(acc1).vote();
            await cf.connect(acc2).vote();
            await cf.withdrawAmount();
            expect (await acc5.getBalance()).to.equal("10000000000000000000100")
        })
    })

    describe("vote", function() {
        it("if no poll has started it throws an error", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            await time.increaseTo(await time.latest() + 20000);
            await expect(cf.vote()).to.be.revertedWith("poll has not started")
        })
        it("if manager tries to vote, it throws an error", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, owner.address);            
            await expect(cf.vote()).to.be.revertedWith("the manager cannot vote")
        })
        it("if a person with no contribution tries to vote, it throws an error", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3, acc4] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, owner.address);            
            await expect(cf.connect(acc4).vote()).to.be.revertedWith("you have not contributed anything, not eligible to vote")
        })
        it("if a person tries to vote again, it throws an error", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3, acc4] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, owner.address);    
            await cf.connect(acc1).vote();        
            await expect(cf.connect(acc1).vote()).to.be.revertedWith("you have already voted")
        })
        it("increases number of yesses on each vote", async function () {
            const CF = await ethers.getContractFactory("CrowdFunding");
            const cf = await CF.deploy(20, 100, 1000);
            const[owner, acc1, acc2, acc3, acc4] = await ethers.getSigners();
            await cf.connect(acc1).contribute({value: 1000});
            await cf.connect(acc2).contribute({value: 200});
            await cf.connect(acc3).contribute({value: 200});
            await time.increaseTo(await time.latest() + 20000);
            await cf.openPoll("something", 100, owner.address); 
            expect (await cf.numberOfYesses()).to.equal(0);   
            await cf.connect(acc1).vote();        
            expect (await cf.numberOfYesses()).to.equal(1);   
        })
    })
});

