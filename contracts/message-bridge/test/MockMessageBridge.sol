// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../MessageBridge.sol";
import "../../interfaces/IEthereumLightClient.sol";

contract MockLightClient is IEthereumLightClient {
    uint64 public latestSlot; // slot of latest known block
    bytes32 public stateRoot; // slot => header

    function submitHeader(uint64 slot, bytes32 _stateRoot) external {
        latestSlot = slot;
        stateRoot = _stateRoot;
    }

    function finalizedExecutionStateRootAndSlot() external view returns (bytes32 root, uint64 slot) {
        return (stateRoot, latestSlot);
    }

    function optimisticExecutionStateRootAndSlot() external view returns (bytes32 root, uint64 slot) {
        return (stateRoot, latestSlot);
    }
}

contract MockMessageBridge {
    MessageBridge public messageBridge;
    MockLightClient public lightClient;

    function initialize(
        uint64 slot,
        address _messageBridgeAddress,
        address otherSideBridgeAddress,
        address _mockLightClient,
        bytes32 _mockStateRoot
    ) public {
        messageBridge = MessageBridge(_messageBridgeAddress);
        lightClient = MockLightClient(_mockLightClient);
        messageBridge.setRemoteMessageBridge(address(otherSideBridgeAddress));
        lightClient.submitHeader(slot, _mockStateRoot);
    }

    function testExecutedMessage(
        bytes calldata message,
        bytes[] calldata accountProof,
        bytes[] calldata storageProof
    ) external returns (bool success) {
        return messageBridge.executeMessage(message, accountProof, storageProof);
    }
}
