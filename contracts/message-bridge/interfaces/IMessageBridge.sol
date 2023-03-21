// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "../../interfaces/IEthereumLightClient.sol";

interface IMessageBridge {
    enum MessageStatus {
        NEW,
        INVALID,
        FAILED,
        EXECUTED
    }

    event MessageSent(bytes32 indexed messageHash, uint256 indexed nonce, bytes message);
    event MessageExecuted(bytes32 indexed messageHash, uint256 indexed nonce, bytes message, bool success);

    function lightClient() external view returns (IEthereumLightClient);

    function sendMessage(address receiver, bytes calldata message, uint256 gasLimit) external returns (bytes32);

    function executeMessage(
        bytes calldata message,
        bytes[] calldata accountProof,
        bytes[] calldata storageProof
    ) external returns (bool);

    function finalizedExecutionStateRootAndSlot() external view returns (bytes32 root, uint64 slot);
}
