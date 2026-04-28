const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying BioVault Wallet Contract...");

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", signer.address);

  // Deploy contract
  const BioVaultWallet = await hre.ethers.getContractFactory("BioVaultWallet");
  const contract = await BioVaultWallet.deploy();

  await contract.deployed();

  console.log("✓ BioVaultWallet deployed to:", contract.address);
  
  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contract.address,
    deployedAt: new Date().toISOString(),
    deployer: signer.address
  };
  
  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("✓ Deployment info saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
