const { expect } = require("chai");

describe("BioVaultWallet", function () {
  let contract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const BioVaultWallet = await ethers.getContractFactory("BioVaultWallet");
    contract = await BioVaultWallet.deploy();
    await contract.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(contract.address).to.be.properAddress;
    });
  });

  describe("Transaction Simulation", function () {
    it("Should simulate transaction", async function () {
      const amount = ethers.utils.parseEther("1.0");
      
      const tx = await contract.simulateTransaction(addr1.address, amount);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
    });

    it("Should reject zero amount", async function () {
      await expect(
        contract.simulateTransaction(addr1.address, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Transaction Execution", function () {
    it("Should execute transaction", async function () {
      const amount = ethers.utils.parseEther("1.0");
      
      const tx = await owner.sendTransaction({
        to: contract.address,
        value: amount
      });
      await tx.wait();

      const initialBalance = await addr1.getBalance();
      
      await contract.executeTransaction(addr1.address, { value: amount });
      
      const finalBalance = await addr1.getBalance();
      expect(finalBalance).to.equal(initialBalance.add(amount));
    });

    it("Should record transaction", async function () {
      const amount = ethers.utils.parseEther("1.0");
      
      await contract.executeTransaction(addr1.address, { value: amount });
      
      const count = await contract.getTransactionCount();
      expect(count).to.equal(1);
    });
  });

  describe("Balance Check", function () {
    it("Should get wallet balance", async function () {
      const balance = await contract.getBalance(owner.address);
      expect(balance).to.be.a("BigNumber");
    });
  });
});
