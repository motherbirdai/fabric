// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Deploy
 * @notice Foundry deployment script for Fabric contracts.
 *
 * Usage:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url $BASE_SEPOLIA_RPC_URL \
 *     --private-key $DEPLOYER_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $BASESCAN_API_KEY
 */

import "../src/FabricRegistry.sol";
import "../src/FabricIdentity.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
    function envAddress(string calldata) external returns (address);
    function envOr(string calldata, address) external returns (address);
}

contract Deploy {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external {
        // Operator address — the gateway wallet that posts reputation updates
        address operatorAddr = vm.envOr("FABRIC_OPERATOR_ADDRESS", msg.sender);

        vm.startBroadcast();

        // 1. Deploy Registry
        FabricRegistry registry = new FabricRegistry(operatorAddr);

        // 2. Deploy Identity (uses same operator)
        FabricIdentity identity = new FabricIdentity(operatorAddr);

        vm.stopBroadcast();
    }
}
