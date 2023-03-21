// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.18;

import "../interfaces/IMessageBridge.sol";

contract MessageTest {
    IMessageBridge public messageBridge;

    event MessageSent(bytes32 msgHash);
    event MessageReceived(address sender, bytes message);

    constructor(address msgbr) {
        messageBridge = IMessageBridge(msgbr);
    }

    function sendMessage(
        address receiver,
        bytes calldata message,
        uint256 gasLimit
    ) external {
        bytes32 msgHash = messageBridge.sendMessage(receiver, message, gasLimit);
        emit MessageSent(msgHash);
    }

    function receiveMessage(address sender, bytes memory message) external returns (bool) {
        emit MessageReceived(sender, message);
    }
}
