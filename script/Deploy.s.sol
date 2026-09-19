// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SYN3RGYToken.sol";
import "../src/ModelRegistry.sol";
import "../src/PaymentManager.sol";
import "../src/PromptExecution.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy SYN3RGY Token
        SYN3RGYToken token = new SYN3RGYToken(deployer);
        console.log("SYN3RGY Token:", address(token));

        // 2. Deploy Model Registry
        ModelRegistry registry = new ModelRegistry(deployer);
        console.log("Model Registry:", address(registry));

        // 3. Deploy Payment Manager
        PaymentManager payment = new PaymentManager(address(token), deployer, deployer);
        console.log("Payment Manager:", address(payment));

        // 4. Deploy Prompt Execution
        PromptExecution prompt = new PromptExecution(deployer);
        console.log("Prompt Execution:", address(prompt));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Deployer:", deployer);
    }
}
