import hre from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy SYN3RGY Token
  console.log("\n--- Deploying SYN3RGY Token ---");
  const SYN3RGYToken = await hre.ethers.getContractFactory("SYN3RGYToken");
  const synToken = await SYN3RGYToken.deploy(deployer.address);
  await synToken.waitForDeployment();
  const tokenAddress = await synToken.getAddress();
  console.log("SYN3RGY Token deployed to:", tokenAddress);

  // 2. Deploy Model Registry
  console.log("\n--- Deploying Model Registry ---");
  const ModelRegistry = await hre.ethers.getContractFactory("ModelRegistry");
  const modelRegistry = await ModelRegistry.deploy(deployer.address);
  await modelRegistry.waitForDeployment();
  const registryAddress = await modelRegistry.getAddress();
  console.log("Model Registry deployed to:", registryAddress);

  // 3. Deploy Payment Manager
  console.log("\n--- Deploying Payment Manager ---");
  const PaymentManager = await hre.ethers.getContractFactory("PaymentManager");
  const paymentManager = await PaymentManager.deploy(
    tokenAddress,
    deployer.address,
    deployer.address
  );
  await paymentManager.waitForDeployment();
  const paymentAddress = await paymentManager.getAddress();
  console.log("Payment Manager deployed to:", paymentAddress);

  // 4. Deploy Prompt Execution
  console.log("\n--- Deploying Prompt Execution ---");
  const PromptExecution = await hre.ethers.getContractFactory("PromptExecution");
  const promptExecution = await PromptExecution.deploy(deployer.address);
  await promptExecution.waitForDeployment();
  const promptAddress = await promptExecution.getAddress();
  console.log("Prompt Execution deployed to:", promptAddress);

  // Summary
  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log("SYN3RGY Token:    ", tokenAddress);
  console.log("Model Registry:   ", registryAddress);
  console.log("Payment Manager:  ", paymentAddress);
  console.log("Prompt Execution: ", promptAddress);
  console.log("========================================");

  // Save deployment addresses
  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SYN3RGYToken: tokenAddress,
      ModelRegistry: registryAddress,
      PaymentManager: paymentAddress,
      PromptExecution: promptAddress,
    },
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\nDeployment data saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
