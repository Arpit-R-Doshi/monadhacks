// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ModelRegistry.sol";
import "../src/PaymentManager.sol";
import "../src/PromptExecution.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Model Registry
        ModelRegistry registry = new ModelRegistry(deployer);
        console.log("Model Registry:", address(registry));

        // 2. Deploy Payment Manager (native MON payments)
        PaymentManager payment = new PaymentManager(deployer, deployer);
        console.log("Payment Manager:", address(payment));

        // 3. Deploy Prompt Execution
        PromptExecution prompt = new PromptExecution(deployer);
        console.log("Prompt Execution:", address(prompt));

        vm.stopBroadcast();

        console.log("\n=== Deployment on Monad Complete (Native MON) ===");
        console.log("Deployer:", deployer);
    }
}
